# Dynamic CORS Strategy for OCapistaine

## Overview

OCapistaine uses a **dynamic, environment-based CORS configuration** that automatically adapts to your development and production environments. This eliminates hardcoded domain lists and seamlessly integrates with your fixed ngrok domain.

## How It Works

### Automatic Origin Detection

The system automatically includes these origins:

1. **Localhost** - Always included for development
   - `http://localhost:8502`
   - `http://127.0.0.1:8502`

2. **Ngrok Domain** - Automatically included if `NGROK_DOMAIN` is set in `.env`
   - Example: `https://ocapistaine.ngrok-free.app`

3. **Production Domains** - Hardcoded trusted domains
   - `https://ocapistaine.vaettir.locki.io`
   - `https://vaettir.locki.io`

4. **Custom Origins** - Optional via `STREAMLIT_CUSTOM_ORIGINS` environment variable

### Configuration Files

```
.streamlit/config.toml          # Base Streamlit config (minimal)
.env                            # Your environment configuration
scripts/set_streamlit_env.py   # Dynamic CORS generator
scripts/run_streamlit.sh        # Convenience launcher
```

## Quick Start

### 1. Set Your Ngrok Domain

Edit `.env`:
```bash
NGROK_DOMAIN=ocapistaine.ngrok-free.app
STREAMLIT_PORT=8502
```

### 2. Start Streamlit

**Option A: Use the convenience script (recommended)**
```bash
./scripts/run_streamlit.sh
```

**Option B: Manual setup**
```bash
eval $(python scripts/set_streamlit_env.py)
streamlit run app/front.py
```

**Option C: VS Code Task**
- Press `Cmd+Shift+P` → "Tasks: Run Task"
- Select "Start Streamlit (with CORS)"

### 3. Verify Configuration

Check the console output:
```
🏛️  Starting OCapistaine Streamlit App

✓ Loaded .env configuration
🔧 Configuring CORS...
# Configured allowed origins:
#   - http://localhost:8502
#   - http://127.0.0.1:8502
#   - https://ocapistaine.ngrok-free.app
#   - https://ocapistaine.vaettir.locki.io
#   - https://vaettir.locki.io

✓ Streamlit will run on: http://localhost:8502
✓ Ngrok domain: https://ocapistaine.ngrok-free.app
```

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `STREAMLIT_PORT` | Port for Streamlit server | `8502` |

### Optional

| Variable | Description | Example |
|----------|-------------|---------|
| `NGROK_DOMAIN` | Fixed ngrok domain (no protocol) | `ocapistaine.ngrok-free.app` |
| `STREAMLIT_CUSTOM_ORIGINS` | Comma-separated additional origins | `https://custom.com,https://other.com` |
| `STREAMLIT_BROWSER_SERVER_ADDRESS` | Public domain for browser config | `ocapistaine.vaettir.locki.io` |
| `STREAMLIT_BROWSER_SERVER_PORT` | Public port | `443` |

### Auto-Generated (by set_streamlit_env.py)

| Variable | Description |
|----------|-------------|
| `STREAMLIT_SERVER_ALLOWED_ORIGINS` | Comma-separated list of all allowed origins |
| `STREAMLIT_SERVER_ENABLE_CORS` | Always set to `true` |
| `STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION` | Set to `false` (behind trusted proxy) |

## Architecture

### Flow Diagram

```
.env (NGROK_DOMAIN, STREAMLIT_PORT)
  ↓
set_streamlit_env.py
  ↓ generates
Environment Variables (STREAMLIT_SERVER_ALLOWED_ORIGINS, etc.)
  ↓ used by
Streamlit App (app/front.py)
  ↓ accepts
Requests from Allowed Origins
```

### Script Logic (`set_streamlit_env.py`)

```python
def build_allowed_origins():
    origins = []

    # 1. Add localhost
    origins.append(f"http://localhost:{STREAMLIT_PORT}")

    # 2. Add ngrok domain if set
    if NGROK_DOMAIN:
        origins.append(f"https://{NGROK_DOMAIN}")

    # 3. Add production domains
    origins.extend(PRODUCTION_DOMAINS)

    # 4. Add custom origins
    if STREAMLIT_CUSTOM_ORIGINS:
        origins.extend(custom_origins.split(","))

    return unique(origins)
```

## Benefits

### 1. **No Hardcoded Domains**
- All origins are generated from environment configuration
- Easy to update without code changes

### 2. **Automatic Ngrok Integration**
- Setting `NGROK_DOMAIN` automatically adds it to allowed origins
- No need to manually update CORS config when ngrok domain changes

### 3. **Environment-Aware**
- Development: Includes localhost
- Production: Includes vaettir.locki.io
- Testing: Easy to add custom domains

### 4. **Single Source of Truth**
- All configuration in `.env` file
- No need to sync multiple config files

### 5. **VS Code Integration**
- Tasks preconfigured for easy launching
- One-click start with correct CORS config

## Troubleshooting

### CORS Errors Still Occurring

**Check allowed origins:**
```bash
python scripts/set_streamlit_env.py
# Look at the "Configured allowed origins" output
```

**Verify environment variables:**
```bash
echo $STREAMLIT_SERVER_ALLOWED_ORIGINS
```

**Test with wildcard (development only):**
```bash
export STREAMLIT_SERVER_ALLOWED_ORIGINS="*"
streamlit run app/front.py
```

### Ngrok Domain Not Included

**Check `.env` file:**
```bash
grep NGROK_DOMAIN .env
```

**Ensure no protocol prefix:**
```bash
# ✓ Correct
NGROK_DOMAIN=ocapistaine.ngrok-free.app

# ✗ Incorrect
NGROK_DOMAIN=https://ocapistaine.ngrok-free.app
```

### WebSocket Connection Failing

**Check browser console:**
- F12 → Network tab → Filter: WS
- Look for `/_stcore/stream` connection
- Should show `101 Switching Protocols`

**Verify proxy configuration:**
```bash
# Check that proxy supports WebSocket upgrade
curl -I https://ocapistaine.vaettir.locki.io/_stcore/health
```

## Production Deployment

### Docker Compose

```yaml
services:
  streamlit:
    build: .
    ports:
      - "8502:8502"
    environment:
      - NGROK_DOMAIN=${NGROK_DOMAIN}
      - STREAMLIT_PORT=8502
      - STREAMLIT_CUSTOM_ORIGINS=${CUSTOM_ORIGINS}
    command: bash scripts/run_streamlit.sh
```

### Systemd Service

```ini
[Unit]
Description=OCapistaine Streamlit App
After=network.target

[Service]
Type=simple
User=jnxmas
WorkingDirectory=/home/jnxmas/ocapistaine
EnvironmentFile=/home/jnxmas/ocapistaine/.env
ExecStart=/home/jnxmas/ocapistaine/scripts/run_streamlit.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

## Security Considerations

### Development vs Production

**Development** (`.env.development`):
```bash
STREAMLIT_CUSTOM_ORIGINS=http://localhost:*
# Or use wildcard for testing
# STREAMLIT_SERVER_ALLOWED_ORIGINS=*
```

**Production** (`.env.production`):
```bash
# Only specific, trusted domains
NGROK_DOMAIN=ocapistaine.ngrok-free.app
# No wildcards, no HTTP (only HTTPS)
```

### XSRF Protection

Currently disabled (`enableXsrfProtection = false`) because:
- App is behind Traefik proxy with HTTPS
- No authentication/session management yet

**Enable in production when adding auth:**
```toml
[server]
enableXsrfProtection = true
cookieSecret = "your-32-char-secret-key"
```

## Related Documentation

- [Streamlit Setup Guide](./STREAMLIT_SETUP.md) - Full setup instructions
- [Proxy Configuration](../orchestration/PROXY_MANAGEMENT.md) - Vaettir proxy setup
- [Development Workflow](../orchestration/DEVELOPMENT.md) - Complete dev workflow

## References

- [Streamlit CORS Configuration](https://docs.streamlit.io/develop/api-reference/configuration/config.toml#server)
- [Streamlit Behind Proxy](https://docs.streamlit.io/develop/concepts/architecture/app-chrome#streamlit-behind-a-reverse-proxy)
- [Environment Variables in Streamlit](https://docs.streamlit.io/develop/api-reference/configuration/config.toml#environment-variables)
