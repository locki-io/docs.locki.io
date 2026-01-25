# Development Workflow

Guide to developing external services locally while testing against production n8n using the proxy pattern.

## Overview

The proxy pattern allows you to:

- Run services (like ocapistaine) on your local machine
- Expose them via ngrok tunnel
- Have production n8n call your local code
- Make changes and see results immediately without deployment

## Architecture

```
Production n8n (vaettir.locki.io)
    │
    │ Workflow calls: http://ocapistaine:8050
    ↓
Proxy Service (nginx container)
    │
    │ Routes to: $OCAPISTAINE_TARGET_URL
    ↓
ngrok Tunnel (https://abc123.ngrok-free.app)
    │
    ↓
Your Local Machine (localhost:8050)
    │
    └─→ ocapistaine running locally
```

## Benefits

✅ **Live development** - Changes reflected immediately
✅ **Real workflows** - Test with actual production n8n
✅ **No deployment** - Skip build/push/deploy cycle
✅ **Debug locally** - Full IDE debugging
✅ **Multiple devs** - Each can tunnel their own instance
✅ **Consistent URLs** - n8n workflows don't change

## Prerequisites

- ngrok account (free tier works)
- Service running locally (e.g., ocapistaine)
- SSH access to production server
- Docker running locally

## Setup Guide

### Step 1: Install ngrok

**Option A: CLI (Recommended)**

```bash
# macOS
brew install ngrok/ngrok/ngrok

# Linux
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok

# Windows
choco install ngrok
```

**Option B: Docker Desktop Extension**

1. Open Docker Desktop
2. Go to Extensions
3. Search for "ngrok"
4. Install ngrok extension

### Step 2: Authenticate ngrok

```bash
# Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_TOKEN
```

### Step 3: Run Your Service Locally

**Example: ocapistaine**

```bash
# Clone the repo
cd ~/dev
git clone https://github.com/locki-io/ocapistaine
cd ocapistaine

# Run with Docker
docker compose up -d

# Or run directly (if you prefer)
python -m uvicorn main:app --reload --port 8000

# Verify it's running
curl http://localhost:8050/health
```

### Step 4: Create ngrok Tunnel

**With Custom Domain (Paid Plan - Recommended)**

```bash
# Start ngrok with custom domain
ngrok http 8050 --domain=ocapistaine.ngrok-free.app

# Or configure in ngrok.yml for persistent setup
cat > ~/.ngrok2/ngrok.yml << EOF
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  ocapistaine:
    proto: http
    addr: 8050
    domain: ocapistaine.ngrok-free.app
EOF

# Then start with:
ngrok start ocapistaine
```

You'll see output like:

```
Session Status                online
Account                       Your Name (Plan: Pro)
Forwarding                    https://ocapistaine.ngrok-free.app -> http://localhost:8050
```

**Without Custom Domain (Free Plan)**

```bash
# Simple tunnel (URL changes every restart)
ngrok http 8050
```

You'll see:

```
Session Status                online
Account                       Your Name (Plan: Free)
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:8050
```

**Copy the ngrok URL** - you'll need it for production configuration.

### Step 5: Configure Production Server

**With Custom Domain (Recommended)**

If using a custom ngrok domain, the configuration is already set correctly:

```bash
# In .env (already configured)
OCAPISTAINE_TARGET_URL=https://ocapistaine.ngrok-free.app
```

The proxy config (`proxy-configs/ocapistaine.conf.template`) is also pre-configured for this domain.

**Without Custom Domain (Free Plan)**

If using a temporary ngrok URL, you need to update it every time ngrok restarts:

```bash
ssh <user>@<server>
cd ~/vaettir
nano .env
```

Update:

```bash
# Proxy target for ocapistaine (update with your current ngrok URL)
OCAPISTAINE_TARGET_URL=https://abc123.ngrok-free.app
```

And update the proxy config:

```bash
nano proxy-configs/ocapistaine.conf.template
```

Update lines 20 and 23 with your ngrok domain:

```nginx
proxy_ssl_name abc123.ngrok-free.app;
...
proxy_set_header Host abc123.ngrok-free.app;
```

Save and exit (Ctrl+X, Y, Enter).

### Step 6: Start Proxy Service

**First Time Setup**

```bash
# SSH to production
ssh <user>@<server>
cd ~/vaettir

# Build proxy image
docker compose build ocapistaine

# Start proxy with both production and proxy profiles
docker compose --profile production --profile proxy up -d ocapistaine

# Check status
docker compose ps ocapistaine

# Check logs
docker compose logs -f ocapistaine
```

Expected output:

```
ocapistaine-1  | nginx: configuration file /etc/nginx/nginx.conf test is successful
ocapistaine-1  | Starting nginx...
```

**Quick Update (from local machine)**

Use the helper script to update and restart the proxy:

```bash
# Update proxy without rebuild (for code changes only)
./scripts/update_proxy.sh

# Update and rebuild (after config changes)
./scripts/update_proxy.sh --build
```

### Step 7: Test the Connection

**From your server**:

```bash
# Test that proxy can reach your local machine
docker compose exec n8n curl -v http://ocapistaine:8000/health
```

Should return response from your local service!

### Step 8: Update n8n Workflows

In your n8n workflows, use:

```
URL: http://ocapistaine:8000
```

The proxy will route to your local machine via ngrok.

## Daily Development Workflow

### Morning Setup

**With Custom Domain (Recommended)**

```bash
# 1. Start local service (port 8050)
cd ~/dev/ocapistaine
docker compose up -d

# 2. Start ngrok tunnel with custom domain
ngrok start ocapistaine
# Or: ngrok http 8050 --domain=ocapistaine.ngrok-free.app

# 3. You're ready! No server updates needed.
# Test: https://ocapistaine.vaettir.locki.io
```

**With Free Plan (Temporary URL)**

```bash
# 1. Start local service
cd ~/dev/ocapistaine
docker compose up -d

# 2. Start ngrok tunnel
ngrok http 8050
# Copy the URL: https://xyz789.ngrok-free.app

# 3. Update production server
ssh <user>@<server>
cd ~/vaettir
nano .env
# Update: OCAPISTAINE_TARGET_URL=https://xyz789.ngrok-free.app

# Also update proxy-configs/ocapistaine.conf.template (lines 20 & 23)
nano proxy-configs/ocapistaine.conf.template

# 4. Rebuild and restart proxy
docker compose build ocapistaine
docker compose --profile production --profile proxy up -d ocapistaine

# 5. You're ready! Make changes locally and test via production n8n
```

### During Development

Make changes to your local code:

```bash
cd ~/dev/ocapistaine
# Edit files in your IDE
```

Changes are immediately available:

- FastAPI auto-reloads (if using --reload)
- Or restart: `docker compose restart`
- n8n workflows call through tunnel to your local code

### Managing the Proxy

**View Proxy Status**

```bash
# From local machine
ssh <user>@<server> 'cd ~/vaettir && docker compose ps ocapistaine'

# Check logs
ssh <user>@<server> 'cd ~/vaettir && docker compose logs -f ocapistaine'
```

**Restart Proxy**

```bash
# Quick restart (no code changes)
ssh <user>@<server> 'cd ~/vaettir && docker compose --profile production --profile proxy restart ocapistaine'

# Or use the helper script from local machine
./scripts/update_proxy.sh
```

**Update Proxy After Code Changes**

```bash
# Commit and push your changes
git add .
git commit -m "Update proxy configuration"
git push

# Update on production (from local machine)
./scripts/update_proxy.sh --build
```

**Renew/Update ngrok URL**

With custom domain, no renewal needed! The URL stays constant.

Without custom domain (free plan):

```bash
# 1. Update .env on production
ssh <user>@<server>
cd ~/vaettir
nano .env
# Change: OCAPISTAINE_TARGET_URL=https://new-ngrok-url.ngrok-free.app

# 2. Update proxy config
nano proxy-configs/ocapistaine.conf.template
# Update lines 20 and 23 with new domain

# 3. Rebuild and restart
docker compose build ocapistaine
docker compose --profile production --profile proxy up -d ocapistaine
```

**Test Proxy Connection**

```bash
# Test from internet
curl -I https://ocapistaine.vaettir.locki.io

# Test from n8n container
ssh <user>@<server> 'docker exec vaettir-n8n-1 curl -I http://ocapistaine:80'
```

### Evening Cleanup (Optional)

```bash
# Stop ngrok (Ctrl+C in terminal)

# Stop local service
cd ~/dev/ocapistaine
docker compose down

# On server: stop proxy (optional, but usually leave it running)
ssh <user>@<server>
cd ~/vaettir
docker compose stop ocapistaine
```

## Configuration Options

### Persistent Subdomain

For a stable URL (requires ngrok Pro):

Create `~/ngrok.yml`:

```yaml
version: 2
authtoken: YOUR_TOKEN
tunnels:
  ocapistaine:
    proto: http
    addr: 8000
    subdomain: ocapistaine-yourname
```

Start:

```bash
ngrok start ocapistaine
```

URL stays same: `https://ocapistaine-yourname.ngrok.io`

### IP Whitelisting

Restrict tunnel to your server's IP:

```bash
# Get server IP
ssh user@your-server curl -4 icanhazip.com

# Start ngrok with IP restriction
ngrok http 8000 --cidr-allow="YOUR_SERVER_IP/32"
```

### Traffic Inspection

View requests in ngrok dashboard:

```bash
# ngrok starts web interface on http://localhost:4040
```

Open in browser to see:

- All HTTP requests/responses
- Replay requests
- Request details and timing

## Adding More Services

The proxy pattern works for any service. Example: add a new service called `myapp`:

### 1. Create Proxy Config Template

```bash
cd ~/vaettir
cp proxy-configs/ocapistaine.conf.template proxy-configs/myapp.conf.template
```

Edit `proxy-configs/myapp.conf.template`:

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 9000;  # Different port

        location / {
            proxy_pass ${MYAPP_TARGET_URL};
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_read_timeout 300;
            proxy_connect_timeout 300;
            proxy_send_timeout 300;
        }
    }
}
```

### 2. Add Service to docker-compose.yml

```yaml
services:
  # ... existing services ...

  myapp:
    build:
      context: .
      dockerfile: Dockerfile.proxy
    restart: always
    environment:
      - MYAPP_TARGET_URL=${MYAPP_TARGET_URL:-http://host.docker.internal:9000}
    profiles: ["proxy"]
```

### 3. Update Dockerfile.proxy (if needed)

For multiple services, update the CMD to process all templates:

```dockerfile
FROM nginx:alpine

RUN apk add --no-cache gettext

COPY proxy-configs/*.conf.template /etc/nginx/templates/

CMD ["/bin/sh", "-c", "for template in /etc/nginx/templates/*.conf.template; do envsubst < $template > /etc/nginx/$(basename $template .template); done && nginx -g 'daemon off;'"]
```

### 4. Configure and Start

```bash
# Add to .env
echo "MYAPP_TARGET_URL=https://def456.ngrok-free.app" >> .env

# Start
docker compose --profile proxy up -d myapp
```

### 5. Use in n8n

Workflows can now call:

```
http://myapp:9000/endpoint
```

## Troubleshooting

### ngrok tunnel not reachable from server

**Check ngrok status**:

```bash
# Local machine: is ngrok running?
# Look for "Session Status: online"
```

**Test from server**:

```bash
ssh user@your-server
curl -v https://abc123.ngrok-free.app
```

**Common issues**:

- ngrok tunnel expired (free tier has limits)
- Local service not running
- Firewall blocking ngrok

### Proxy returns 502 Bad Gateway

**Check proxy logs**:

```bash
docker compose logs ocapistaine
```

**Verify target URL**:

```bash
# On server
docker compose exec ocapistaine env | grep OCAPISTAINE_TARGET_URL

# Should show your ngrok URL
```

**Update if needed**:

```bash
nano .env
# Update OCAPISTAINE_TARGET_URL
docker compose --profile proxy restart ocapistaine
```

### n8n can't resolve service name

**Check if proxy is running**:

```bash
docker compose ps | grep ocapistaine
```

**Start proxy**:

```bash
docker compose --profile proxy up -d ocapistaine
```

**Check Docker network**:

```bash
docker network inspect vaettir_default
# Should show ocapistaine container
```

### Slow response times

**ngrok adds latency**:

- Expect ~50-200ms overhead
- Use `ngrok http 8050 --region=eu` for EU (closer to server)

**Check ngrok dashboard** (http://localhost:4040):

- View request timing
- See where time is spent

### Local service not receiving requests

**Check ngrok is forwarding**:

```bash
# ngrok dashboard shows requests?
# Local service logs show requests?
```

**Test local service directly**:

```bash
curl http://localhost:8000/endpoint
```

**Check local firewall**:

```bash
# ngrok needs to access localhost:8050
```

## Best Practices

### Security

1. **Use authentication**:

   ```bash
   ngrok http 8000 --basic-auth="user:pass"
   ```

2. **Restrict IPs** (paid feature):

   ```bash
   ngrok http 8000 --cidr-allow="server-ip/32"
   ```

3. **Implement app-level auth** in your service

4. **Don't expose production data** on local dev instances

### Performance

1. **Choose nearest region**:

   ```bash
   ngrok http 8000 --region=eu  # or us, ap, au, sa, in, jp
   ```

2. **Monitor ngrok dashboard** for bottlenecks

3. **Use persistent tunnel** (paid) to avoid reconnections

### Workflow

1. **Document tunnel URL** in team chat when sharing
2. **Stop tunnel** when done to free ngrok resources
3. **Use separate workspace** in Opik for dev traces
4. **Test locally first** before tunneling to production

## Alternatives to ngrok

### Cloudflare Tunnel

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create ocapistaine

# Run
cloudflared tunnel --url http://localhost:8050
```

### Tailscale

For team-wide access without public exposure:

```bash
# Install Tailscale on both local machine and server
# Access via Tailscale IP directly (no ngrok needed)
```

### SSH Reverse Tunnel

```bash
# On local machine
ssh -R 8000:localhost:8000 user@your-server

# On server, update .env:
OCAPISTAINE_TARGET_URL=http://localhost:8050
```

## Advanced: Production Cutover

When ready to deploy real service to production:

### Option 1: Deploy Container

Add to `docker-compose.yml`:

```yaml
services:
  ocapistaine-prod:
    image: ghcr.io/locki-io/ocapistaine:latest
    restart: always
    environment:
      # ... service config
```

Update `.env`:

```bash
OCAPISTAINE_TARGET_URL=http://ocapistaine-prod:8000
```

Restart:

```bash
docker compose --profile proxy restart ocapistaine
# Or remove proxy and use direct service
docker compose up -d ocapistaine-prod
```

### Option 2: Direct Service

Remove proxy entirely:

```yaml
services:
  ocapistaine:
    image: ghcr.io/locki-io/ocapistaine:latest
    # Direct service, no proxy needed
```

n8n workflows remain unchanged: `http://ocapistaine:8000`

## Summary

The proxy pattern provides:

- Seamless local → production integration
- Zero workflow changes
- Flexible switching between dev/prod
- Scalable to multiple services

Perfect for rapid development cycles!

## Next Steps

- [Workflow Best Practices](./WORKFLOWS.md) - Build better workflows
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues
- [Architecture Overview](./ARCHITECTURE.md) - How it all fits together
