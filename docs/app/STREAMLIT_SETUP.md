# Streamlit Application Setup

Guide for configuring and deploying the OCapistaine Streamlit application.

## Deployment Architecture

```
Production:
  User → ocapistaine.vaettir.locki.io → Vaettir Nginx → Render (ocapistaine.onrender.com)

Development:
  User → ocapistaine-dev.vaettir.locki.io → Vaettir Nginx → ngrok → localhost:8502
```

| Environment | Public URL | Backend | CORS |
|-------------|-----------|---------|------|
| **Production** | `ocapistaine.vaettir.locki.io` | Render | Static (render.yaml) |
| **Development** | `ocapistaine-dev.vaettir.locki.io` | ngrok &rarr; local | Dynamic (set_streamlit_env.py) |
| **Local only** | `localhost:8502` | Direct | None needed |

## Production (Render)

Production runs on Render with static configuration. No dynamic CORS scripts needed.

### Configuration

All Streamlit settings are in `render.yaml`:

```yaml
envVars:
  - key: STREAMLIT_SERVER_ENABLE_CORS
    value: "true"
  - key: STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION
    value: "false"
  - key: STREAMLIT_SERVER_ALLOWED_ORIGINS
    value: "https://ocapistaine.onrender.com,https://ocapistaine.vaettir.locki.io,https://vaettir.locki.io"
```

### Vaettir Proxy (Nginx)

The Vaettir proxy forwards HTTPS traffic to Render with SNI and WebSocket support:

```nginx
location / {
    set $backend "${OCAPISTAINE_TARGET_URL}";  # https://ocapistaine.onrender.com
    proxy_pass $backend;

    # SNI for Render shared hosting
    proxy_ssl_server_name on;
    proxy_ssl_name ocapistaine.onrender.com;

    # Headers
    proxy_set_header Host ocapistaine.onrender.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-Host $host;

    # WebSocket support (required for Streamlit)
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_buffering off;

    # Timeouts for WebSocket and cold starts
    proxy_read_timeout 3600;
    proxy_connect_timeout 300;
    proxy_send_timeout 3600;
}
```

**Key points:**
- `proxy_ssl_server_name on` is required for Render's shared hosting (SNI)
- `proxy_connect_timeout 300` handles Render cold starts (standard plan)
- `proxy_buffering off` is required for Streamlit WebSocket streaming
- The `Origin` header can be passed through since `ALLOWED_ORIGINS` includes the vaettir domain

### Deploy

Push to main. Render auto-deploys from the repo:

```bash
git push origin main
# Render builds and deploys automatically (render.yaml)
```

## Development (ngrok)

Local development uses ngrok tunneled through the Vaettir proxy at `ocapistaine-dev.vaettir.locki.io`.

### Setup

1. **Configure `.env`:**

```bash
# ngrok tunnel domain
NGROK_DOMAIN=your-dev-tunnel.ngrok-free.app
STREAMLIT_PORT=8502
```

2. **Start Streamlit with CORS:**

```bash
# Option A: Convenience script (recommended)
./scripts/run_streamlit.sh

# Option B: Manual
eval $(python scripts/set_streamlit_env.py)
streamlit run app/front.py
```

3. **Start ngrok tunnel:**

```bash
ngrok http 8502 --domain=$NGROK_DOMAIN
```

4. **Access via:** `https://ocapistaine-dev.vaettir.locki.io`

### Dynamic CORS (set_streamlit_env.py)

For development, the script auto-generates `STREAMLIT_SERVER_ALLOWED_ORIGINS` from:

- `http://localhost:8502` (always)
- `https://{NGROK_DOMAIN}` (if set in `.env`)
- `https://ocapistaine-dev.vaettir.locki.io` (dev proxy)
- `https://ocapistaine.vaettir.locki.io` (production proxy)
- Any `STREAMLIT_CUSTOM_ORIGINS` entries

## Local Only

For quick local development without proxy:

```bash
streamlit run app/front.py
# Access at http://localhost:8502
```

No CORS configuration needed for localhost-only access.

## Static Config File

A base `.streamlit/config.toml` provides static defaults:

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

**Note:** Streamlit 1.53.0 does NOT support `allowedOrigins` in config.toml. Use environment variables instead.

## Verification

### Check WebSocket Connection

Open browser DevTools (F12) &rarr; Network tab:

1. Filter by `WS` (WebSockets)
2. Look for `/_stcore/stream`
3. Should show `101 Switching Protocols` (success)
4. NOT `403 Forbidden` (CORS issue)

### Test Endpoints

```bash
# Health check
curl https://ocapistaine.vaettir.locki.io/_stcore/health

# Host config
curl https://ocapistaine.vaettir.locki.io/_stcore/host-config
```

## Troubleshooting

### 403 on WebSocket

**Check CORS origins:**

```bash
# Production: check render.yaml STREAMLIT_SERVER_ALLOWED_ORIGINS

# Development: verify dynamic config
python scripts/set_streamlit_env.py
echo $STREAMLIT_SERVER_ALLOWED_ORIGINS
```

**Quick test with wildcard (dev only):**

```bash
export STREAMLIT_SERVER_ALLOWED_ORIGINS="*"
streamlit run app/front.py
```

### Render Cold Start

Standard plan instances may take 30-60s to wake up. The Vaettir proxy shows a custom error page during this time (`error-offline.html`). The `proxy_connect_timeout 300` ensures the proxy waits long enough.

### App Loads but Data Doesn't Update

WebSocket not connected. Check:

1. Browser DevTools &rarr; Network &rarr; WS filter
2. Proxy logs: `docker compose logs` on the Vaettir server
3. Render logs: Render dashboard &rarr; Logs

### XSRF Token Errors

Disabled by default (`enableXsrfProtection = false`) since the app runs behind a trusted HTTPS proxy.

## Security

### Production

- Specific origins only in `render.yaml` (no wildcards)
- HTTPS enforced by both Render and Vaettir proxy
- Authentication via `STREAMLIT_AUTH_PASSWORD` (set in Render dashboard)

### Development

- Dynamic origins via `set_streamlit_env.py`
- Can use wildcard for testing: `STREAMLIT_SERVER_ALLOWED_ORIGINS=*`
- ngrok provides HTTPS tunnel

## References

- [Streamlit Configuration](https://docs.streamlit.io/develop/api-reference/configuration/config.toml)
- [CORS Strategy](./CORS_STRATEGY.md) - Dynamic CORS details
- [Proxy Configuration](../orchestration/PROXY_MANAGEMENT.md) - Vaettir proxy setup
