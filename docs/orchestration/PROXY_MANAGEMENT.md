# Proxy Management Guide

Quick reference for managing the ocapistaine proxy service.

## Overview

The proxy service routes traffic from `https://ocapistaine.vaettir.locki.io` to your local machine via ngrok:

```
User/n8n → vaettir.locki.io:443 → Traefik → ocapistaine:80 → ngrok → localhost:8050
```

## Quick Commands

### Check Status

```bash
# View proxy status
ssh <user>@<server> 'cd ~/vaettir && docker compose ps ocapistaine'

# View logs
ssh <user>@<server> 'cd ~/vaettir && docker compose logs -f ocapistaine'

# Test endpoint
curl -I https://ocapistaine.vaettir.locki.io
```

### Restart Proxy

```bash
# Quick restart (no changes)
./scripts/update_proxy.sh

# Restart with rebuild (after config changes)
./scripts/update_proxy.sh --build
```

### Update Configuration

```bash
# 1. Make changes locally
nano proxy-configs/ocapistaine.conf.template

# 2. Commit and push
git add .
git commit -m "Update proxy config"
git push

# 3. Deploy to production
./scripts/update_proxy.sh --build
```

## Ngrok Setup

### With Custom Domain (Current Setup)

**Start ngrok:**
```bash
cd ~/dev/ocapistaine
docker compose up -d

# Start ngrok with custom domain
ngrok http 8050 --domain=ocapistaine.ngrok-free.app
```

**Benefits:**
- URL stays constant: `https://ocapistaine.ngrok-free.app`
- No configuration updates needed
- Production config never changes

**Configuration:**
- `.env`: `OCAPISTAINE_TARGET_URL=https://ocapistaine.ngrok-free.app`
- Proxy config has hardcoded domain (lines 20 & 23)

### Without Custom Domain (Free Plan)

If using free ngrok, URL changes on each restart.

**When ngrok URL changes:**

1. Get new URL: `https://xyz123.ngrok-free.app`

2. Update production `.env`:
```bash
ssh <user>@<server>
cd ~/vaettir
nano .env
# Update: OCAPISTAINE_TARGET_URL=https://xyz123.ngrok-free.app
```

3. Update proxy config:
```bash
nano proxy-configs/ocapistaine.conf.template
# Line 20: proxy_ssl_name xyz123.ngrok-free.app;
# Line 23: proxy_set_header Host xyz123.ngrok-free.app;
```

4. Rebuild and restart:
```bash
docker compose build ocapistaine
docker compose --profile production --profile proxy up -d ocapistaine
```

## Troubleshooting

### Proxy Not Running

**Check service status:**
```bash
ssh <user>@<server> 'cd ~/vaettir && docker compose ps ocapistaine'
```

**If not running:**
```bash
ssh <user>@<server> 'cd ~/vaettir && docker compose --profile production --profile proxy up -d ocapistaine'
```

### Connection Refused

**Check ngrok is running:**
```bash
# On your local machine
curl http://localhost:4040/api/tunnels
```

**Check local service:**
```bash
curl http://localhost:8050/health
```

### Bad Gateway (502)

**Common causes:**
1. Ngrok URL changed (free plan)
2. Host header mismatch
3. ngrok domain doesn't match config

**Fix:**
```bash
# Check current ngrok URL
curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'

# Update production .env if different
ssh <user>@<server>
cd ~/vaettir
nano .env
# Update OCAPISTAINE_TARGET_URL

# Restart proxy
docker compose --profile production --profile proxy restart ocapistaine
```

### Cannot Find Module Error

Nginx config error - check logs:
```bash
ssh <user>@<server> 'cd ~/vaettir && docker compose logs ocapistaine --tail 50'
```

**Common issue:** Environment variable substitution problem

**Fix:**
```bash
# Check generated nginx config
ssh <user>@<server> 'docker exec vaettir-ocapistaine-1 cat /etc/nginx/nginx.conf'

# Should see the actual URL, not ${OCAPISTAINE_TARGET_URL}
```

### TLS/SSL Errors

**SNI Error:**
```
This client does not support TLS SNI
```

**Fix:** Ensure these lines are in `proxy-configs/ocapistaine.conf.template`:
```nginx
proxy_ssl_server_name on;
proxy_ssl_name ocapistaine.ngrok-free.app;
```

**Host Error:**
```
Received a request for different Host than the current tunnel
```

**Fix:** Ensure Host header matches ngrok domain:
```nginx
proxy_set_header Host ocapistaine.ngrok-free.app;
```

### IPv6 Connection Issues

If seeing IPv6 errors in logs:
```
connect() to [2a05:...]:443 failed (101: Network unreachable)
```

**Fix:** Already configured to force IPv4 in proxy config:
```nginx
resolver 8.8.8.8 8.8.4.4 valid=300s ipv6=off;
```

### Streamlit Apps - JavaScript Required / WebSocket Failures

**Symptoms:**
- Page loads but shows "You need to enable JavaScript to run this app"
- WebSocket connection errors in browser console: `WebSocket connection to 'wss://ocapistaine.vaettir.locki.io/_stcore/stream' failed`
- 403 Forbidden errors on `/_stcore/stream` in logs
- App appears broken or disconnected

**Root Causes:**
1. **Nginx proxy missing WebSocket upgrade headers** (most common)
2. Streamlit CORS configuration blocking proxy domain
3. Missing proxy headers for proper host forwarding

**Fix 1: Update Nginx Proxy for WebSocket Support**

The nginx proxy on vaettir **MUST** include WebSocket upgrade headers. Edit the proxy configuration:

```bash
# SSH to vaettir
ssh <user>@<server>

# Edit the ocapistaine proxy config
cd ~/vaettir
nano proxy-configs/ocapistaine.conf.template
```

**Required configuration:**

```nginx
# WebSocket upgrade support (add at the top, outside server block)
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;

    # DNS resolver for dynamic upstream
    resolver 8.8.8.8 8.8.4.4 valid=300s ipv6=off;

    location / {
        # Target ngrok URL (from environment variable)
        proxy_pass ${OCAPISTAINE_TARGET_URL};

        # WebSocket support - CRITICAL for Streamlit
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Disable buffering for real-time streaming
        proxy_buffering off;
        proxy_cache off;

        # Standard proxy headers
        proxy_set_header Host ocapistaine.ngrok-free.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # SSL settings for ngrok
        proxy_ssl_server_name on;
        proxy_ssl_name ocapistaine.ngrok-free.app;

        # Timeouts (important for WebSocket long-polling)
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

**Rebuild and restart:**

```bash
# Rebuild the proxy container with new config
docker compose build ocapistaine

# Restart with production profile
docker compose --profile production --profile proxy up -d ocapistaine

# Verify it's running
docker compose ps ocapistaine

# Check logs for errors
docker compose logs ocapistaine --tail 50
```

**Fix 2: Streamlit CORS Configuration**

In your local ocapistaine app, ensure CORS is configured via **environment variables** (not config.toml):

```bash
# In ocapistaine/.env
NGROK_DOMAIN=ocapistaine.ngrok-free.app

# Run Streamlit with automatic CORS setup
./scripts/run_streamlit.sh
```

The `run_streamlit.sh` script automatically configures:
- `STREAMLIT_SERVER_ALLOWED_ORIGINS` with all required domains
- `STREAMLIT_SERVER_ENABLE_CORS=true`
- `STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=false`

**Note:** Streamlit 1.53.0 does NOT support `allowedOrigins` in config.toml. You MUST use environment variables.

**Fix 3: Verify Configuration**

After applying fixes, test the connection:

```bash
# 1. Check WebSocket endpoint accessibility
curl -I https://ocapistaine.vaettir.locki.io/_stcore/stream

# Should return "426 Upgrade Required" (not 403 or 502)

# 2. Test in browser
open https://ocapistaine.vaettir.locki.io

# 3. Check browser console (F12 → Console)
# Should see: WebSocket connection established
# Should NOT see: WebSocket connection failed or 403 errors

# 4. Check Network tab (F12 → Network → WS filter)
# Look for: /_stcore/stream with status "101 Switching Protocols"
```

**Troubleshooting:**

| Error | Cause | Fix |
|-------|-------|-----|
| `WebSocket connection failed` | Missing WebSocket headers in proxy | Add `Upgrade` and `Connection` headers (Fix 1) |
| `403 Forbidden` | CORS blocking domain | Configure STREAMLIT_SERVER_ALLOWED_ORIGINS (Fix 2) |
| `502 Bad Gateway` | Proxy can't reach ngrok | Verify ngrok is running and URL is correct |
| `426 Upgrade Required` | **NORMAL** - This is correct for direct curl (not a browser) | No fix needed |

**For detailed Streamlit configuration:** See [STREAMLIT_SETUP.md](../app/STREAMLIT_SETUP.md)

## Monitoring

### View Real-Time Traffic

**Ngrok Web Interface:**
```bash
# Open in browser
open http://localhost:4040
```

Shows:
- All HTTP requests
- Request/response details
- Replay capability
- Performance metrics

### Check Traefik Routing

```bash
ssh <user>@<server> 'cd ~/vaettir && docker compose logs traefik | grep ocapistaine'
```

Should see:
```
Creating router ocapistaine
Creating service ocapistaine
```

## Maintenance

### Regular Tasks

**Daily:**
- Ensure ngrok is running locally
- Verify connection: `curl -I https://ocapistaine.vaettir.locki.io`

**Weekly:**
- Check proxy logs for errors
- Monitor ngrok usage/bandwidth

**Monthly:**
- Update ngrok client if needed
- Review proxy performance

### Updating Ngrok

```bash
# macOS
brew upgrade ngrok

# Or download from https://ngrok.com/download
```

### Backup Configuration

Configuration is in git, but to backup manually:

```bash
# Backup proxy config
scp <user>@<server>:~/vaettir/proxy-configs/ocapistaine.conf.template ./PRIVATE_backups/

# Backup .env (contains ngrok URL)
ssh <user>@<server> 'cd ~/vaettir && grep OCAPISTAINE .env' > ./PRIVATE_backups/proxy-env-backup.txt
```

## Adding New Proxy Services

To proxy additional services:

1. **Create config template:**
```bash
cp proxy-configs/ocapistaine.conf.template proxy-configs/myservice.conf.template
```

2. **Update docker-compose.yml:**
```yaml
myservice:
  build:
    context: .
    dockerfile: Dockerfile.proxy-myservice
  environment:
    - MYSERVICE_TARGET_URL=${MYSERVICE_TARGET_URL}
  profiles: ["proxy"]
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.myservice.rule=Host(`myservice.vaettir.locki.io`)"
    - "traefik.http.routers.myservice.entrypoints=websecure"
    - "traefik.http.routers.myservice.tls=true"
    - "traefik.http.routers.myservice.tls.certresolver=myresolver"
    - "traefik.http.services.myservice.loadbalancer.server.port=80"
```

3. **Add DNS record** in Cloudflare: `myservice.vaettir.locki.io → 213.136.85.11`

4. **Start ngrok** with custom domain: `myservice.ngrok-free.app`

## Resources

- [Main Documentation](./INDEX.md)
- [Development Workflow](./DEVELOPMENT.md)
- [Port Management](./PORTS.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [ngrok Documentation](https://ngrok.com/docs)
