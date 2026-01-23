# Streamlit Application Setup for Proxy

Guide for configuring Streamlit applications to work with the Vaettir proxy system.

## Problem

When proxying a Streamlit app through ngrok and Traefik, you may encounter:
- "You need to enable JavaScript to run this app" message
- WebSocket connection failures (403 Forbidden on `/_stcore/stream`)
- CORS errors in browser console

This happens because Streamlit checks the origin of requests and blocks connections from unexpected domains.

## Solution

Configure Streamlit to allow connections from your production domain.

### Step 1: Create Streamlit Config Directory

In your Streamlit application directory (e.g., `ocapistaine`):

```bash
cd ~/dev/ocapistaine
mkdir -p .streamlit
```

### Step 2: Create Config File

Create `.streamlit/config.toml`:

```toml
[server]
# Enable CORS for proxy access
enableCORS = true
enableXsrfProtection = false

# Allow WebSocket connections from your domains
# Add all domains that will access your app
allowedOrigins = [
    "https://ocapistaine.vaettir.locki.io",
    "https://ocapistaine.ngrok-free.app",
    "http://localhost:8050",
    "https://vaettir.locki.io"
]

# Server settings
port = 8050
address = "0.0.0.0"
headless = true

[browser]
# Disable automatic browser opening
gatherUsageStats = false
serverAddress = "ocapistaine.vaettir.locki.io"
serverPort = 443

[client]
# Show detailed error messages
showErrorDetails = true
```

### Step 3: Environment Variables (Alternative)

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

**Check allowed origins:**
```bash
# Verify config is loaded
grep allowedOrigins .streamlit/config.toml
```

**Add wildcard (less secure, for testing):**
```toml
[server]
enableCORS = true
enableXsrfProtection = false
allowedOrigins = ["*"]
```

**Restart and test again.**

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

For production, use specific origins (not wildcards):

```toml
[server]
enableCORS = true
enableXsrfProtection = true  # Enable for production
allowedOrigins = [
    "https://ocapistaine.vaettir.locki.io",
    "https://vaettir.locki.io"
]
```

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

`.streamlit/config.dev.toml`:
```toml
[server]
enableCORS = true
enableXsrfProtection = false
allowedOrigins = ["*"]
port = 8050
```

### Production

`.streamlit/config.prod.toml`:
```toml
[server]
enableCORS = true
enableXsrfProtection = true
allowedOrigins = [
    "https://ocapistaine.vaettir.locki.io"
]
port = 8050
```

**Load specific config:**
```bash
# Development
STREAMLIT_CONFIG_FILE=.streamlit/config.dev.toml streamlit run app.py

# Production (via environment variable in docker-compose.yml)
STREAMLIT_CONFIG_FILE=.streamlit/config.prod.toml
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
port = 8050
address = "0.0.0.0"
headless = true
allowedOrigins = [
    "https://ocapistaine.vaettir.locki.io",
    "https://ocapistaine.ngrok-free.app"
]

[browser]
gatherUsageStats = false
serverAddress = "ocapistaine.vaettir.locki.io"
serverPort = 443

[client]
showErrorDetails = true
```

### docker-compose.yml
```yaml
services:
  app:
    build: .
    ports:
      - "8050:8050"
    volumes:
      - .:/app
      - ./.streamlit:/app/.streamlit:ro
    environment:
      - STREAMLIT_SERVER_ENABLE_CORS=true
      - STREAMLIT_SERVER_PORT=8050
    restart: unless-stopped
```

### Start Everything

```bash
# 1. Start local app
cd ~/dev/ocapistaine
docker compose up -d

# 2. Start ngrok
ngrok http 8050 --domain=ocapistaine.ngrok-free.app

# 3. Access via proxy
open https://ocapistaine.vaettir.locki.io
```

## References

- [Streamlit Configuration](https://docs.streamlit.io/develop/api-reference/configuration/config.toml)
- [Streamlit Server Configuration](https://docs.streamlit.io/develop/api-reference/configuration/config.toml#server)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [WebSocket Proxy Guide](../orchestration/PROXY_MANAGEMENT.md)
- [Development Workflow](../orchestration/DEVELOPMENT.md)
