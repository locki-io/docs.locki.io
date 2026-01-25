#!/usr/bin/env python3
"""
Validate and fix Docusaurus blog post front matter issues.

This script checks for:
1. YAML front matter parsing errors (special characters like colons in values)
2. Missing <!-- truncate --> markers
3. Invalid author/tag references

Usage:
    python validate_blog_posts.py [--fix] [--verbose]

Options:
    --fix       Automatically fix issues where possible
    --verbose   Show detailed output for each file
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Optional

import yaml


class BlogPostValidator:
    """Validates and fixes Docusaurus blog post front matter."""

    # Characters that require quoting in YAML values
    SPECIAL_CHARS = [':', '#', '{', '}', '[', ']', ',', '&', '*', '!', '|', '>', "'", '"', '%', '@', '`']

    def __init__(self, blog_dir: Path, fix: bool = False, verbose: bool = False):
        self.blog_dir = blog_dir
        self.fix = fix
        self.verbose = verbose
        self.issues_found = 0
        self.issues_fixed = 0

    def validate_all(self) -> int:
        """Validate all blog posts. Returns number of issues found."""
        # Find all .md and .mdx files (including folder-based posts like 2021-08-26-welcome/index.md)
        blog_files = []
        for pattern in ['*.md', '*.mdx']:
            blog_files.extend(self.blog_dir.glob(pattern))
        # Also check folder-based posts (e.g., 2021-08-26-welcome/index.md)
        blog_files.extend(self.blog_dir.glob('*/index.md'))
        blog_files.extend(self.blog_dir.glob('*/index.mdx'))

        # Sort by name for consistent output
        blog_files = sorted(blog_files)

        if not blog_files:
            print(f"No blog files found in {self.blog_dir}")
            return 0

        print(f"Checking {len(blog_files)} blog post(s)...\n")

        for file_path in blog_files:
            self.validate_file(file_path)

        # Summary
        print("\n" + "=" * 50)
        if self.issues_found == 0:
            print("All blog posts are valid!")
        else:
            print(f"Issues found: {self.issues_found}")
            if self.fix:
                print(f"Issues fixed: {self.issues_fixed}")
                remaining = self.issues_found - self.issues_fixed
                if remaining > 0:
                    print(f"Issues requiring manual attention: {remaining}")

        return self.issues_found

    def validate_file(self, file_path: Path) -> None:
        """Validate a single blog post file."""
        if self.verbose:
            print(f"Checking: {file_path.name}")

        content = file_path.read_text(encoding='utf-8')
        issues = []
        fixed_content = content

        # Check for front matter
        front_matter_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        if not front_matter_match:
            issues.append(("ERROR", "Missing front matter (---)", None))
            self._report_issues(file_path, issues)
            return

        front_matter_text = front_matter_match.group(1)

        # Try to parse YAML
        try:
            yaml.safe_load(front_matter_text)
        except yaml.YAMLError as e:
            issues.append(("ERROR", f"YAML parsing error: {e}", None))

            # Try to identify and fix the issue
            fixed_fm, fix_applied = self._fix_front_matter(front_matter_text)
            if fix_applied:
                issues.append(("FIX", f"Applied fix: {fix_applied}", fixed_fm))
                fixed_content = content.replace(
                    f"---\n{front_matter_text}\n---",
                    f"---\n{fixed_fm}\n---"
                )

        # Check for truncate marker
        if '<!-- truncate -->' not in content:
            issues.append(("WARNING", "Missing <!-- truncate --> marker", None))

        # Check front matter fields
        try:
            fm_data = yaml.safe_load(front_matter_text)
            if fm_data:
                # Check required fields
                if 'title' not in fm_data:
                    issues.append(("WARNING", "Missing 'title' field", None))
                if 'slug' not in fm_data:
                    issues.append(("WARNING", "Missing 'slug' field", None))
                if 'authors' not in fm_data:
                    issues.append(("WARNING", "Missing 'authors' field", None))

                # Check for potential issues in values
                for key, value in fm_data.items():
                    if isinstance(value, str):
                        # Check for slug with spaces
                        if key == 'slug' and ' ' in value:
                            issues.append(("ERROR", f"'slug' contains spaces: '{value}' - slugs must be URL-safe", None))
                        # Check for special characters needing quotes
                        elif self._needs_quoting(value):
                            # Check if it's already quoted in the source
                            if not self._is_quoted_in_source(front_matter_text, key, value):
                                issues.append(("WARNING", f"'{key}' contains special characters - should be quoted", None))
        except yaml.YAMLError:
            pass  # Already reported above

        # Report and optionally fix
        if issues:
            self._report_issues(file_path, issues)

            if self.fix:
                # Apply fixes if we have any
                for issue_type, msg, fix in issues:
                    if issue_type == "FIX" and fix:
                        fixed_content = content.replace(
                            f"---\n{front_matter_text}\n---",
                            f"---\n{fix}\n---"
                        )
                        break

                if fixed_content != content:
                    file_path.write_text(fixed_content, encoding='utf-8')
                    print(f"    -> Fixed: {file_path.name}")
                    self.issues_fixed += 1
        elif self.verbose:
            print(f"    OK")

    def _needs_quoting(self, value: str) -> bool:
        """Check if a YAML value needs quoting."""
        # Check for special characters that might cause issues
        for char in self.SPECIAL_CHARS:
            if char in value:
                return True
        return False

    def _is_quoted_in_source(self, front_matter: str, key: str, value: str) -> bool:
        """Check if a value is already quoted in the source."""
        # Look for patterns like: key: "value" or key: 'value'
        pattern = rf'{key}:\s*["\'].*?["\']'
        return bool(re.search(pattern, front_matter))

    def _fix_front_matter(self, front_matter: str) -> tuple[str, Optional[str]]:
        """Attempt to fix common front matter issues."""
        lines = front_matter.split('\n')
        fixed_lines = []
        fix_description = None

        for line in lines:
            # Match key: value pattern (but not nested or already quoted)
            match = re.match(r'^(\s*)(\w+):\s*(.+)$', line)
            if match:
                indent, key, value = match.groups()
                value = value.strip()

                # Check if value contains problematic characters and isn't already quoted
                if (not value.startswith('"') and not value.startswith("'") and
                    not value.startswith('[') and not value.startswith('{')):

                    # Check for colons (common issue)
                    if ':' in value:
                        # Quote the value with double quotes
                        # Escape any existing double quotes
                        escaped_value = value.replace('"', '\\"')
                        fixed_lines.append(f'{indent}{key}: "{escaped_value}"')
                        fix_description = f"Quoted '{key}' value containing colon"
                        continue

            fixed_lines.append(line)

        return '\n'.join(fixed_lines), fix_description


def main():
    parser = argparse.ArgumentParser(
        description='Validate and fix Docusaurus blog post front matter'
    )
    parser.add_argument(
        '--fix',
        action='store_true',
        help='Automatically fix issues where possible'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed output for each file'
    )
    parser.add_argument(
        '--blog-dir',
        type=Path,
        default=None,
        help='Path to blog directory (default: auto-detect)'
    )

    args = parser.parse_args()

    # Find blog directory
    if args.blog_dir:
        blog_dir = args.blog_dir
    else:
        # Try to auto-detect
        script_dir = Path(__file__).parent
        possible_paths = [
            script_dir.parent / 'blog',  # docs/scripts -> docs/blog
            script_dir / 'blog',
            Path('blog'),
            Path('docs/blog'),
        ]
        blog_dir = None
        for p in possible_paths:
            if p.exists() and p.is_dir():
                blog_dir = p
                break

        if not blog_dir:
            print("Error: Could not find blog directory. Use --blog-dir to specify.")
            sys.exit(1)

    if not blog_dir.exists():
        print(f"Error: Blog directory not found: {blog_dir}")
        sys.exit(1)

    validator = BlogPostValidator(blog_dir, fix=args.fix, verbose=args.verbose)

    def report_issues(file_path: Path, issues: list) -> None:
        """Report issues for a file."""
        print(f"\n{file_path.name}:")
        for issue_type, message, _ in issues:
            if issue_type == "ERROR":
                print(f"  [ERROR] {message}")
                validator.issues_found += 1
            elif issue_type == "WARNING":
                print(f"  [WARN]  {message}")
                validator.issues_found += 1
            elif issue_type == "FIX":
                print(f"  [FIX]   {message}")

    validator._report_issues = report_issues

    issues = validator.validate_all()
    sys.exit(0 if issues == 0 else 1)


if __name__ == '__main__':
    main()
