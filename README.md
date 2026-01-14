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

- Default locale: English (`en`)
- Secondary: French (`fr`)

Translations are in `i18n/` directory.

## Contributing

- Edit docs in `docs/` directory
- Preview with `npm start`
- Submit PR to `locki-io/docs.locki.io`
