# Streamlit Application Documentation

Documentation for Streamlit applications integrated with Vaettir n8n orchestration.

## Quick Start

If your Streamlit app shows "You need to enable JavaScript" or has WebSocket errors:

👉 **[Quick Fix Guide](./STREAMLIT_QUICKSTART.md)** - Fix 403 errors in 5 minutes

## Complete Guides

### Setup and Configuration
- **[Streamlit Setup](./STREAMLIT_SETUP.md)** - Complete guide for configuring Streamlit apps to work with the Vaettir proxy system

## Integration with n8n

Streamlit apps can be accessed through the Vaettir proxy system:

```
User → vaettir.locki.io → Traefik → Proxy → ngrok → Streamlit (localhost:8050)
```

### Key Concepts

**CORS Configuration**: Streamlit needs to allow connections from proxy domains
**WebSocket Support**: Required for Streamlit's real-time updates
**Session Management**: Handled by Streamlit's built-in session state

### Access Points

- **Production**: https://ocapistaine.vaettir.locki.io
- **Direct ngrok**: https://ocapistaine.ngrok-free.app
- **Local dev**: http://localhost:8050

## Common Issues

### App Shows JavaScript Required
**Problem**: Streamlit blocking proxy domain
**Solution**: Configure `allowedOrigins` in `.streamlit/config.toml`
**Guide**: [STREAMLIT_QUICKSTART.md](./STREAMLIT_QUICKSTART.md)

### WebSocket 403 Forbidden
**Problem**: CORS blocking WebSocket connections
**Solution**: Enable CORS and disable XSRF protection
**Guide**: [STREAMLIT_SETUP.md](./STREAMLIT_SETUP.md#step-2-create-config-file)

### App Disconnected
**Problem**: ngrok tunnel stopped or local app crashed
**Solution**: Restart ngrok and check local app status
**Guide**: [STREAMLIT_SETUP.md](./STREAMLIT_SETUP.md#troubleshooting)

## Related Documentation

### n8n Orchestration
- **[Development Workflow](../orchestration/DEVELOPMENT.md)** - Setting up ngrok proxy
- **[Proxy Management](../orchestration/PROXY_MANAGEMENT.md)** - Managing the proxy service
- **[Port Management](../orchestration/PORTS.md)** - Understanding port configuration

### Architecture
- **[System Architecture](../orchestration/ARCHITECTURE.md)** - How proxy system works
- **[Troubleshooting](../orchestration/TROUBLESHOOTING.md)** - General debugging guide

## Example Configuration

### Minimal .streamlit/config.toml

```toml
[server]
enableCORS = true
enableXsrfProtection = false
port = 8050
address = "0.0.0.0"
allowedOrigins = [
    "https://ocapistaine.vaettir.locki.io",
    "https://ocapistaine.ngrok-free.app"
]

[browser]
serverAddress = "ocapistaine.vaettir.locki.io"
serverPort = 443
```

### Docker Compose

```yaml
services:
  streamlit:
    build: .
    ports:
      - "8050:8050"
    volumes:
      - ./.streamlit:/app/.streamlit:ro
    environment:
      - STREAMLIT_SERVER_ENABLE_CORS=true
```

## Support

For issues or questions:
1. Check [STREAMLIT_SETUP.md](./STREAMLIT_SETUP.md) troubleshooting section
2. Review [Streamlit Documentation](https://docs.streamlit.io)
3. Check [Proxy Management](../orchestration/PROXY_MANAGEMENT.md) for proxy issues
