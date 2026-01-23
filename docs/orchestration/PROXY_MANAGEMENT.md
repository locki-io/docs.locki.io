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
ssh jnxmas@vaettir.locki.io 'cd ~/vaettir && docker compose ps ocapistaine'

# View logs
ssh jnxmas@vaettir.locki.io 'cd ~/vaettir && docker compose logs -f ocapistaine'

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
ssh jnxmas@vaettir.locki.io
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
ssh jnxmas@vaettir.locki.io 'cd ~/vaettir && docker compose ps ocapistaine'
```

**If not running:**
```bash
ssh jnxmas@vaettir.locki.io 'cd ~/vaettir && docker compose --profile production --profile proxy up -d ocapistaine'
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
ssh jnxmas@vaettir.locki.io
cd ~/vaettir
nano .env
# Update OCAPISTAINE_TARGET_URL

# Restart proxy
docker compose --profile production --profile proxy restart ocapistaine
```

### Cannot Find Module Error

Nginx config error - check logs:
```bash
ssh jnxmas@vaettir.locki.io 'cd ~/vaettir && docker compose logs ocapistaine --tail 50'
```

**Common issue:** Environment variable substitution problem

**Fix:**
```bash
# Check generated nginx config
ssh jnxmas@vaettir.locki.io 'docker exec vaettir-ocapistaine-1 cat /etc/nginx/nginx.conf'

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

### Streamlit Apps - JavaScript Required / 403 WebSocket

**Symptoms:**
- Page loads but shows "You need to enable JavaScript to run this app"
- 403 Forbidden errors on `/_stcore/stream` in logs
- App appears broken or disconnected

**Cause:** Streamlit CORS configuration blocking proxy domain

**Quick Fix:**

1. Create Streamlit config in your app directory:
```bash
cd ~/dev/ocapistaine
mkdir -p .streamlit
cat > .streamlit/config.toml << 'EOF'
[server]
enableCORS = true
enableXsrfProtection = false
allowedOrigins = [
    "https://ocapistaine.vaettir.locki.io",
    "https://ocapistaine.ngrok-free.app"
]
port = 8050
address = "0.0.0.0"
EOF
```

2. Restart your app:
```bash
docker compose restart
```

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
ssh jnxmas@vaettir.locki.io 'cd ~/vaettir && docker compose logs traefik | grep ocapistaine'
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
scp jnxmas@vaettir.locki.io:~/vaettir/proxy-configs/ocapistaine.conf.template ./PRIVATE_backups/

# Backup .env (contains ngrok URL)
ssh jnxmas@vaettir.locki.io 'cd ~/vaettir && grep OCAPISTAINE .env' > ./PRIVATE_backups/proxy-env-backup.txt
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
