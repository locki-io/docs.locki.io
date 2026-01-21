# docs.locki.io

Ò Capistaine documentation site built with [Docusaurus](https://docusaurus.io/).

## Quick Start

````bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Serve production build locally
npm run serve

## one command
```bash
# all together
npm run build && npm run serve
````

## Structure

```
docs/
├── agents/
│   ├── forseti
│   │   ├── README.md
│   ├── niove
│   │   ├── README.md
|   ├── ocapistaine
│   │   ├── README.md
├── audierne2026/
│   ├── data-privacy.md
│   ├── overview.md
│   ├── transparency-reports.md
├── hackathon/
│   ├── encode-hackathon.md
├── methods/
│   ├── triz.md                 # TRIZ methodology
│   ├── separation-of-concerns.md # for coding
│   └── theory-of-constraints.md # for resolving
├── usage/
│   ├── faq.md
│   ├── getting-started.md
│   ├── troubleshooting.md
└── workflows/
    ├── n8n-integrations/
    │   └── Participons-List-Issues.md
    ├── consolidation.md        # Weekly consolidation
    ├── contribution-charter.md # Governance rules
    ├── n8n-github-integration.md # N8N setup
    └── firecrawl.md           # Document acquisition

```

## Deployment

### GitHub Pages

```bash
GIT_USER=<username> npm run deploy
```

### Manual

Build output is in `build/` directory, can be served by any static host.

## Localization

- Default locale: English (`en`)
- Secondary: French (`fr`)

Translations are in `i18n/` directory.

## Contributing

- Edit docs in `docs/` directory
- Preview with `npm start`
- Submit PR to `locki-io/docs.locki.io`

## Troubleshooting

### Broken Links Error

If you encounter `[ERROR] Docusaurus found broken links!`, check for:

1. **Links to directories instead of files**: Docusaurus requires links to point to specific `.md` files, not directories
   - Bad: `[docs](./directory/)`
   - Good: `[docs](./directory/index.md)` or just use code formatting: `` `directory/` ``

2. **Missing or renamed files**: Verify all linked files exist
   - Use `git status` to check for deleted/renamed files
   - Update links to match new filenames

3. **Case sensitivity**: Ensure file paths match exact case (especially on case-insensitive systems)

**Example fix**: Change `[n8n_integrations/](./n8n_integrations/)` to `` `n8n_integrations/` `` in `docs/workflows/n8n-github-integration.md:14`
