# Vaettir Documentation

Complete documentation for the Vaettir n8n automation platform.

## Table of Contents

### Getting Started
- **[Setup Guide](./SETUP.md)** - Installation and configuration for local dev and production
- **[Architecture Overview](./ARCHITECTURE.md)** - System components and how they work together
- **[Usage Guide](./USAGE.md)** - Basic usage and workflow creation

### Development
- **[Development Workflow](./DEVELOPMENT.md)** - Local development with ngrok proxy pattern
- **[Proxy Management](./PROXY_MANAGEMENT.md)** - Managing and troubleshooting the proxy service
- **[Workflows Best Practices](./WORKFLOWS.md)** - Recommended patterns and conventions

### Applications
- **[Streamlit Apps](../app/STREAMLIT_SETUP.md)** - Configuring Streamlit applications for proxy access

### Operations
- **[Observability](./OBSERVABILITY.md)** - Monitoring with Opik integration
- **[Port Management](./PORTS.md)** - Complete port reference and firewall configuration
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

### Reference
- **[External Resources](./REFERENCES.md)** - Links to n8n, Opik, and related documentation

## Quick Links

- **Production Instance**: https://vaettir.locki.io
- **n8n Documentation**: https://docs.n8n.io
- **Opik Documentation**: https://www.comet.com/docs/opik
- **ocapistaine Integration**: https://github.com/locki-io/ocapistaine
- **ocapistaine Knowledge Base**: [../docs/docs/](../docs/docs/) (git submodule - architecture, methods, workflows)

## Project Structure

```
vaettir/
├── docker-compose.yml          # Main compose config (production-safe)
├── docker-compose.override.yml # Local dev overrides (gitignored)
├── Dockerfile.n8n              # Custom n8n image with observability
├── Dockerfile.proxy            # Nginx proxy for ngrok routing
├── n8n-task-runners.json       # Python/JS runner permissions
├── proxy-configs/              # Proxy templates for services
├── scripts/                    # Management scripts
├── docs/                       # Knowledge base (git submodule)
│   └── docs/
│       ├── orchestration/      # n8n orchestration docs (this folder)
│       └── app/                # Streamlit app documentation
└── .env                        # Environment configuration (gitignored)
```

## Support

For issues or questions:
1. Check [Troubleshooting](./TROUBLESHOOTING.md)
2. Review [n8n Community](https://community.n8n.io)
3. Create an issue in the repository
