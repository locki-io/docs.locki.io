#!/bin/bash
# Sanitize documentation for public deployment
# Replaces sensitive usernames and paths with placeholders

set -e

DOCS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$DOCS_DIR/.sanitize-backup-$(date +%Y%m%d-%H%M%S)"

echo "🔒 Sanitizing documentation for public deployment"
echo ""

# Create backup
echo "📦 Creating backup at: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
find "$DOCS_DIR/docs" -name "*.md" -type f -exec cp --parents {} "$BACKUP_DIR" \; 2>/dev/null || \
find "$DOCS_DIR/docs" -name "*.md" -type f | while read file; do
    rel_path="${file#$DOCS_DIR/}"
    mkdir -p "$BACKUP_DIR/$(dirname "$rel_path")"
    cp "$file" "$BACKUP_DIR/$rel_path"
done

echo "✓ Backup created"
echo ""

# Function to sanitize a file
sanitize_file() {
    local file="$1"
    echo "  Processing: ${file#$DOCS_DIR/}"

    # Create temp file
    local temp_file="${file}.tmp"

    # Apply all replacements
    sed \
        -e 's/jnxmas@vaettir\.locki\.io/<user>@<server>/g' \
        -e 's/jnxmas@<server>/<user>@<server>/g' \
        -e 's|/Users/jnxmas|/Users/<user>|g' \
        -e 's|/home/jnxmas|/home/<user>|g' \
        -e 's|User=jnxmas|User=<user>|g' \
        -e 's|WorkingDirectory=/home/<user>|WorkingDirectory=/home/<user>|g' \
        "$file" > "$temp_file"

    # Replace original file
    mv "$temp_file" "$file"
}

# Count files to process
total_files=$(find "$DOCS_DIR/docs" -name "*.md" -type f | wc -l)
echo "📝 Processing $total_files markdown files..."
echo ""

# Process all markdown files
find "$DOCS_DIR/docs" -name "*.md" -type f | while read file; do
    sanitize_file "$file"
done

echo ""
echo "✅ Sanitization complete!"
echo ""
echo "Summary of changes:"
echo "  • jnxmas@vaettir.locki.io → <user>@<server>"
echo "  • /Users/jnxmas → /Users/<user>"
echo "  • /home/jnxmas → /home/<user>"
echo "  • User=jnxmas → User=<user>"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "To restore from backup:"
echo "  cp -r $BACKUP_DIR/docs/* $DOCS_DIR/docs/"
echo ""
echo "To verify changes:"
echo "  cd $DOCS_DIR"
echo "  git diff docs/"
