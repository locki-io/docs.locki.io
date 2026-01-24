# Streamlit Application Setup for Proxy

Guide for configuring Streamlit applications to work with the Vaettir proxy system.

## Problem

When proxying a Streamlit app through ngrok and Traefik, you may encounter:
- "You need to enable JavaScript to run this app" message
- WebSocket connection failures (403 Forbidden on `/_stcore/stream`)
- CORS errors in browser console

This happens because Streamlit checks the origin of requests and blocks connections from unexpected domains.

## Solution

Configure Streamlit to allow connections from your production domain using dynamic environment-based configuration.

### Step 1: Configure Environment Variables

OCapistaine uses a dynamic CORS strategy that automatically includes:
- Localhost (for development)
- Your fixed ngrok domain (if `NGROK_DOMAIN` is set)
- Production domains (vaettir.locki.io)
- Any custom origins you specify

Edit your `.env` file:

```bash
# Set your fixed ngrok domain
NGROK_DOMAIN=ocapistaine.ngrok-free.app

# Streamlit will automatically allow:
# - http://localhost:8502
# - https://ocapistaine.ngrok-free.app (from NGROK_DOMAIN)
# - https://ocapistaine.vaettir.locki.io
# - https://vaettir.locki.io

# Optional: Add custom origins (comma-separated)
# STREAMLIT_CUSTOM_ORIGINS=https://my-custom-domain.com
```

### Step 2: Use Dynamic Configuration Script

Run Streamlit with automatic CORS configuration:

```bash
# Method 1: Export environment variables, then run
eval $(python scripts/set_streamlit_env.py)
streamlit run app/front.py

# Method 2: Use shell script (recommended)
# Create a run script that does both
```

The script automatically configures:
- `STREAMLIT_SERVER_ALLOWED_ORIGINS` - All allowed domains
- `STREAMLIT_SERVER_ENABLE_CORS=true`
- `STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=false`
- `STREAMLIT_BROWSER_SERVER_ADDRESS` - Set to ngrok domain if configured

### Step 3: Static Config File

A basic `.streamlit/config.toml` is provided, which sets static values:

```toml
[server]
enableCORS = true
enableXsrfProtection = false
port = 8502
address = "0.0.0.0"
headless = true

[browser]
gatherUsageStats = false

[client]
showErrorDetails = true
```

**IMPORTANT:** Streamlit 1.53.0 does NOT support `allowedOrigins` in config.toml. Use environment variables instead (configured by `set_streamlit_env.py`).

### Alternative: Manual Environment Variables

Alternatively, set via environment variables:

```bash
# In your shell or .env file
export STREAMLIT_SERVER_ENABLE_CORS=true
export STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=false
export STREAMLIT_SERVER_PORT=8050
export STREAMLIT_SERVER_ADDRESS="0.0.0.0"
export STREAMLIT_SERVER_HEADLESS=true
export STREAMLIT_BROWSER_SERVER_ADDRESS="ocapistaine.vaettir.locki.io"
export STREAMLIT_BROWSER_SERVER_PORT=443
```

### Step 4: Docker Configuration

If running in Docker, update `docker-compose.yml`:

```yaml
services:
  ocapistaine:
    build: .
    ports:
      - "8050:8050"
    environment:
      - STREAMLIT_SERVER_ENABLE_CORS=true
      - STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=false
      - STREAMLIT_SERVER_PORT=8050
      - STREAMLIT_SERVER_ADDRESS=0.0.0.0
      - STREAMLIT_SERVER_HEADLESS=true
    volumes:
      - ./.streamlit:/app/.streamlit:ro
    restart: unless-stopped
```

### Step 5: Restart Application

```bash
# If running directly
streamlit run app.py

# If using Docker
docker compose restart ocapistaine
```

## Verification

### Check Streamlit Config

```bash
# View current Streamlit config
streamlit config show

# Or check if config file is loaded
cat .streamlit/config.toml
```

### Test WebSocket Connection

Open browser developer tools (F12) and check:

1. **Network tab**: Look for `/_stcore/stream` WebSocket connection
   - Should show status `101 Switching Protocols` (success)
   - Not `403 Forbidden` (CORS issue)

2. **Console tab**: Should not show CORS errors like:
   ```
   Access to XMLHttpRequest at 'https://...' from origin 'https://...' has been blocked by CORS policy
   ```

### Test Endpoints

```bash
# Health check (should return OK)
curl https://ocapistaine.vaettir.locki.io/_stcore/health

# Host config (should return JSON)
curl https://ocapistaine.vaettir.locki.io/_stcore/host-config

# Stream endpoint (WebSocket - will timeout, but shouldn't be 403)
curl -I https://ocapistaine.vaettir.locki.io/_stcore/stream
```

## Troubleshooting

### Still Getting 403 on WebSocket

**Check environment variables:**
```bash
# Verify CORS is configured
echo $STREAMLIT_SERVER_ALLOWED_ORIGINS

# Should show comma-separated list of domains
# If empty, run: eval $(python scripts/set_streamlit_env.py)
```

**For testing, allow all origins (less secure):**
```bash
export STREAMLIT_SERVER_ALLOWED_ORIGINS="*"
streamlit run app/front.py
```

**If that works, the issue is CORS. Check your domain is in the allowed list.**

**Note:** Most WebSocket failures are caused by missing proxy headers, not CORS. See [PROXY_MANAGEMENT.md](../orchestration/PROXY_MANAGEMENT.md) for nginx WebSocket configuration.

### XSRF Token Errors

If you see XSRF token errors:
```toml
[server]
enableXsrfProtection = false
```

This is safe when behind a proxy with HTTPS.

### App Loads but Data Doesn't Update

**Check WebSocket in browser DevTools:**
- Network tab → Filter: WS (WebSockets)
- Should see `/_stcore/stream` with status `101`

**If not connected:**
1. Check proxy logs: `ssh jnxmas@vaettir.locki.io 'cd ~/vaettir && docker compose logs ocapistaine'`
2. Verify proxy config has WebSocket support (see below)

### Verify Proxy Configuration

The proxy must support WebSocket upgrade. Check `/Users/jnxmas/dev/vaettir/proxy-configs/ocapistaine.conf.template`:

```nginx
# Map for WebSocket upgrade
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    location / {
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_buffering off;
    }
}
```

### Browser Shows "Disconnected" Badge

**Common causes:**
1. WebSocket connection failing
2. Streamlit app crashed
3. ngrok tunnel stopped

**Check:**
```bash
# Check local Streamlit is running
curl http://localhost:8050/_stcore/health

# Check ngrok tunnel
curl http://localhost:4040/api/tunnels

# Check production proxy
curl -I https://ocapistaine.vaettir.locki.io
```

## Security Considerations

### Production Settings

For production, use specific origins (not wildcards) via environment variables:

```bash
# Set in production environment or .env
export STREAMLIT_SERVER_ALLOWED_ORIGINS="https://ocapistaine.vaettir.locki.io,https://vaettir.locki.io"
export STREAMLIT_SERVER_ENABLE_CORS=true
export STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=true  # Enable for production if needed
```

**Note:** OCapistaine automatically configures these via `scripts/set_streamlit_env.py`.

### HTTPS Only

Always use HTTPS in production. HTTP connections will fail with CORS errors.

### Cookie Security

If using authentication, configure secure cookies:

```toml
[server]
cookieSecret = "your-secret-key-min-32-chars-long"

[browser]
serverAddress = "ocapistaine.vaettir.locki.io"
```

## Multiple Environments

### Development

```bash
# Allow all origins for local testing
export STREAMLIT_SERVER_ALLOWED_ORIGINS="*"
export STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=false
streamlit run app/front.py
```

### Production

```bash
# Specific origins only
export STREAMLIT_SERVER_ALLOWED_ORIGINS="https://ocapistaine.vaettir.locki.io,https://vaettir.locki.io"
export STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=false
streamlit run app/front.py
```

**Using OCapistaine's dynamic config:**
```bash
# Automatically configures based on .env settings
eval $(python scripts/set_streamlit_env.py)
streamlit run app/front.py

# Or use the convenience script
./scripts/run_streamlit.sh
```

## Complete Example

### Directory Structure
```
ocapistaine/
├── app.py
├── requirements.txt
├── docker-compose.yml
├── Dockerfile
└── .streamlit/
    ├── config.toml
    └── secrets.toml (for API keys)
```

### config.toml
```toml
[server]
enableCORS = true
enableXsrfProtection = false
port = 8502
address = "0.0.0.0"
headless = true
# NOTE: allowedOrigins is NOT supported in Streamlit 1.53.0
# Use environment variable STREAMLIT_SERVER_ALLOWED_ORIGINS instead

[browser]
gatherUsageStats = false
# serverAddress and serverPort are set dynamically via environment variables
# STREAMLIT_BROWSER_SERVER_ADDRESS and STREAMLIT_BROWSER_SERVER_PORT

[client]
showErrorDetails = true
```

### docker-compose.yml
```yaml
services:
  app:
    build: .
    ports:
      - "8502:8502"
    volumes:
      - .:/app
      - ./.streamlit:/app/.streamlit:ro
    environment:
      - STREAMLIT_SERVER_ENABLE_CORS=true
      - STREAMLIT_SERVER_PORT=8502
      - STREAMLIT_SERVER_ALLOWED_ORIGINS=https://ocapistaine.vaettir.locki.io,https://ocapistaine.ngrok-free.app
    restart: unless-stopped
```

### Start Everything

```bash
# 1. Start local app (using run script with automatic CORS config)
cd ~/dev/ocapistaine
./scripts/run_streamlit.sh

# 2. In another terminal, start ngrok
ngrok http 8502 --domain=ocapistaine.ngrok-free.app

# 3. Access via proxy
open https://ocapistaine.vaettir.locki.io
```

## References

- [Streamlit Configuration](https://docs.streamlit.io/develop/api-reference/configuration/config.toml)
- [Streamlit Server Configuration](https://docs.streamlit.io/develop/api-reference/configuration/config.toml#server)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [WebSocket Proxy Guide](../orchestration/PROXY_MANAGEMENT.md)
- [Development Workflow](../orchestration/DEVELOPMENT.md)
