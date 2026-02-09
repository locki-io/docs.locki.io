# Streamlit Quick Start - Fix 403 WebSocket Error

Quick fix for "You need to enable JavaScript" and 403 WebSocket errors.

## The Problem

Your Streamlit app loads but doesn't work because:
- WebSocket connections (`/_stcore/stream`) return 403 Forbidden
- Streamlit is blocking connections from the proxy domain

## Quick Fix

### Production (Render)

Check that `render.yaml` includes the proxy domain in `STREAMLIT_SERVER_ALLOWED_ORIGINS`:

```yaml
- key: STREAMLIT_SERVER_ALLOWED_ORIGINS
  value: "https://ocapistaine.onrender.com,https://ocapistaine.vaettir.locki.io,https://vaettir.locki.io"
```

Redeploy after changes.

### Development (ngrok)

```bash
# 1. Set up CORS
eval $(python scripts/set_streamlit_env.py)

# 2. Start Streamlit
streamlit run app/front.py

# 3. In another terminal, start ngrok
ngrok http 8502 --domain=$NGROK_DOMAIN
```

Access via `https://ocapistaine-dev.vaettir.locki.io`

## Verify It Works

Open browser DevTools (F12) &rarr; Network tab:
- Look for `/_stcore/stream` WebSocket
- Should show status `101 Switching Protocols`
- NOT `403 Forbidden`

## If Still Not Working

See full troubleshooting guide: [STREAMLIT_SETUP.md](./STREAMLIT_SETUP.md)

### Common Issues

**Still 403?**

```bash
# Check what origins are configured
echo $STREAMLIT_SERVER_ALLOWED_ORIGINS

# Try wildcard (dev only)
export STREAMLIT_SERVER_ALLOWED_ORIGINS="*"
streamlit run app/front.py
```

**App not responding?**

```bash
# Check health
curl http://localhost:8502/_stcore/health

# Production
curl https://ocapistaine.vaettir.locki.io/_stcore/health
```

**Render cold start?**

Standard plan instances may take 30-60s to wake up. Wait and retry.
