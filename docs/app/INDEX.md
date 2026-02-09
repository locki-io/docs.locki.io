---
slug: /app/streamlit-overview
title: Streamlit Application Documentation
sidebar_label: Streamlit Overview
---

# Streamlit Application Documentation

Documentation for the OCapistaine Streamlit application, deployed on Render and proxied through Vaettir.

## Quick Start

If your Streamlit app shows "You need to enable JavaScript" or has WebSocket errors:

**[Quick Fix Guide](./STREAMLIT_QUICKSTART.md)** - Fix 403 errors in 5 minutes

## Deployment

```
Production:
  User → ocapistaine.vaettir.locki.io → Vaettir Nginx → Render

Development:
  User → ocapistaine-dev.vaettir.locki.io → Vaettir Nginx → ngrok → localhost
```

### Access Points

| Environment | URL | Backend |
|-------------|-----|---------|
| **Production** | https://ocapistaine.vaettir.locki.io | Render |
| **Development** | https://ocapistaine-dev.vaettir.locki.io | ngrok &rarr; local |
| **Local only** | http://localhost:8502 | Direct |

## Guides

- **[Streamlit Setup](./STREAMLIT_SETUP.md)** - Full configuration guide (Render + ngrok)
- **[CORS Strategy](./CORS_STRATEGY.md)** - How CORS is handled per environment

## Key Concepts

- **CORS Configuration**: Static on Render (`render.yaml`), dynamic for dev (`set_streamlit_env.py`)
- **WebSocket Support**: Required for Streamlit real-time updates, handled by Vaettir nginx proxy
- **Session Management**: Streamlit's built-in session state

## Common Issues

### App Shows JavaScript Required

**Problem**: Streamlit blocking proxy domain
**Solution**: Check `STREAMLIT_SERVER_ALLOWED_ORIGINS` includes the proxy domain
**Guide**: [STREAMLIT_QUICKSTART.md](./STREAMLIT_QUICKSTART.md)

### WebSocket 403 Forbidden

**Problem**: CORS blocking WebSocket connections
**Solution**: Add the requesting origin to allowed origins
**Guide**: [STREAMLIT_SETUP.md](./STREAMLIT_SETUP.md#troubleshooting)

### App Disconnected (Production)

**Problem**: Render instance cold start or crash
**Solution**: Wait 30-60s for cold start, check Render dashboard for errors

### App Disconnected (Development)

**Problem**: ngrok tunnel stopped or local app crashed
**Solution**: Restart ngrok and local Streamlit process

## Related Documentation

- **[Proxy Management](../orchestration/PROXY_MANAGEMENT.md)** - Vaettir nginx proxy configuration
- **[System Architecture](../orchestration/ARCHITECTURE.md)** - How the proxy system works
- **[Troubleshooting](../orchestration/TROUBLESHOOTING.md)** - General debugging guide
