# docs.locki.io

OCapistaine documentation site built with [Docusaurus](https://docusaurus.io/).

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Serve production build locally
npm run serve
```

## Structure

```
docs/
├── methods/
│   ├── triz.md                 # TRIZ methodology
│   ├── separation-of-concerns.md
│   └── theory-of-constraints.md
└── workflows/
    ├── consolidation.md        # Weekly consolidation
    ├── contribution-charter.md # Governance rules
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

- Default locale: French (`fr`)
- Secondary: English (`en`)

Translations are in `i18n/` directory.

## Contributing

- Edit docs in `docs/` directory
- Preview with `npm start`
- Submit PR to `locki-io/docs.locki.io`
