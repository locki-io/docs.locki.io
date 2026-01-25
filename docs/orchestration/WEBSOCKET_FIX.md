# WebSocket Fix for Streamlit Proxied Through ngrok

## Problem Summary

WebSocket connections to `wss://ocapistaine.vaettir.locki.io/_stcore/stream` failing with:
- "WebSocket connection failed"
- Browser console shows repeated connection attempts
- HTTP 403 responses with "Cross origin websockets not allowed"

## Root Causes (Multiple Issues)

### 1. Missing WebSocket Headers
The nginx proxy needs proper WebSocket upgrade headers for Streamlit's real-time communication.

### 2. Cross-Origin WebSocket Rejection (Main Issue)
When browser connects to `https://ocapistaine.vaettir.locki.io`, the `Origin` header is set to that domain. But ngrok expects the Origin to match `https://ocapistaine.ngrok-free.app`, causing:
```
HTTP/1.1 403 Forbidden
Cross origin websockets not allowed
```

### 3. ngrok Interstitial Page
ngrok's free tier shows an interstitial page that can block API/WebSocket requests.

---

## Solution: Complete Proxy Configuration

Use the template at `proxy-configs/agent.conf.template.example`:

```nginx
events {
    worker_connections 1024;
}

http {
    # Use Google DNS, disable IPv6
    resolver 8.8.8.8 8.8.4.4 valid=300s ipv6=off;
    resolver_timeout 5s;

    # Map for WebSocket upgrade (required for Streamlit, etc.)
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;

        location / {
            # Use variable to force DNS resolution and avoid IPv6
            set $backend "${AGENT_NAME_TARGET_URL}";
            proxy_pass $backend;

            # Enable SNI for ngrok
            proxy_ssl_server_name on;
            proxy_ssl_name AGENT_NAME.ngrok-free.app;

            # Set Host header to ngrok domain (required by ngrok)
            proxy_set_header Host AGENT_NAME.ngrok-free.app;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header X-Forwarded-Host $host;

            # CRITICAL: Override Origin header for cross-origin WebSocket
            # Without this, ngrok rejects with "Cross origin websockets not allowed"
            proxy_set_header Origin https://AGENT_NAME.ngrok-free.app;

            # Bypass ngrok interstitial page (required for free tier, harmless for paid)
            proxy_set_header ngrok-skip-browser-warning "true";

            # WebSocket support (for Streamlit)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;

            # Disable buffering for WebSocket
            proxy_buffering off;

            # Timeout settings for long-running requests and WebSockets
            proxy_read_timeout 3600;
            proxy_connect_timeout 300;
            proxy_send_timeout 3600;
        }
    }
}
```

**Key headers for WebSocket through ngrok:**
| Header | Purpose |
|--------|---------|
| `Origin: https://AGENT.ngrok-free.app` | Prevents "Cross origin websockets not allowed" |
| `ngrok-skip-browser-warning: true` | Bypasses ngrok interstitial |
| `Upgrade: $http_upgrade` | WebSocket protocol upgrade |
| `Connection: $connection_upgrade` | WebSocket connection handling |
| `Host: AGENT.ngrok-free.app` | Required for ngrok routing |

---

## Deployment Steps

### Step 1: Create/Update Proxy Config

On the server:
```bash
ssh <user>@<server>
cd ~/vaettir

# Copy from example and customize
cp proxy-configs/agent.conf.template.example proxy-configs/ocapistaine.conf.template

# Edit and replace AGENT_NAME with ocapistaine
nano proxy-configs/ocapistaine.conf.template
```

Replace all instances of:
- `AGENT_NAME` -> `ocapistaine`
- `AGENT_NAME_TARGET_URL` -> `OCAPISTAINE_TARGET_URL`

### Step 2: Rebuild and Restart

```bash
docker compose build ocapistaine
docker compose --profile production --profile proxy up -d ocapistaine
```

### Step 3: Verify

```bash
# Check container is running
docker compose ps ocapistaine

# Check config has Origin header
docker exec vaettir-ocapistaine-1 cat /etc/nginx/nginx.conf | grep "Origin"

# Should show: proxy_set_header Origin https://ocapistaine.ngrok-free.app;
```

---

## Testing WebSocket

### From Command Line (HTTP/1.1)

```bash
# This should return 101 Switching Protocols
curl --http1.1 -si "https://ocapistaine.vaettir.locki.io/_stcore/stream" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: test123" \
  -H "Sec-WebSocket-Version: 13" | head -10
```

**Expected output:**
```
HTTP/1.1 101 Switching Protocols
Connection: upgrade
Upgrade: websocket
```

### In Browser

1. Open `https://ocapistaine.vaettir.locki.io`
2. Open DevTools (F12) -> Network tab -> Filter "WS"
3. Look for `_stcore/stream` with status **101 Switching Protocols**
4. Console should NOT show "WebSocket connection failed" errors

---

## Troubleshooting

### 403 "Cross origin websockets not allowed"

**Cause:** Origin header mismatch

**Fix:** Ensure this line is in nginx config:
```nginx
proxy_set_header Origin https://ocapistaine.ngrok-free.app;
```

Then rebuild:
```bash
docker compose build ocapistaine
docker compose --profile production --profile proxy up -d ocapistaine
```

### 400 "Can Upgrade only to WebSocket"

**Cause:** HTTP/2 request (browsers default to HTTP/2)

This is expected for regular HTTP requests. WebSocket connections should work in browser.

### 502 Bad Gateway

**Cause:** ngrok tunnel not running or unreachable

**Fix:** Check ngrok is running locally:
```bash
curl -I https://ocapistaine.ngrok-free.app
# Should return 200 OK
```

### WebSocket works in curl but not browser

**Cause:** Traefik HTTP/2 WebSocket handling

Traefik v3.2.5+ has fixes for HTTP/2 WebSocket. Ensure Traefik is up to date:
```bash
docker exec vaettir-traefik-1 traefik version
# Should be 3.2.5 or later
```

Restart Traefik if needed:
```bash
docker compose restart traefik
```

---

## Custom Error Page for Offline Agents

When ngrok is down (ERR_NGROK_3200), nginx shows a **custom branded page** with a Discord invite link instead of the default ngrok error.

### How it Works

1. **Error Detection**: nginx intercepts upstream errors (502, 503, 504)
2. **Custom Page**: Shows `/error-offline.html` with Discord link
3. **Environment Variable**: `DISCORD_INVITE_URL` is injected at container startup

### Setup

Add to your `.env` file:
```bash
DISCORD_INVITE_URL=https://discord.gg/your-invite-code
```

Then rebuild:
```bash
docker compose build ocapistaine
docker compose --profile production --profile proxy up -d ocapistaine
```

### Testing the Error Page

Stop your ngrok tunnel to simulate the agent being offline:
```bash
# Locally: kill ngrok
pkill ngrok

# Then visit your proxy URL
curl https://ocapistaine.vaettir.locki.io
# Should show custom page with Discord link
```

---

## Proxy Config File Management

Proxy configs are **not tracked in git** (environment-specific):

```
proxy-configs/
├── agent.conf.template.example  # Git-tracked template
├── error-offline.html.template  # Git-tracked error page
├── ocapistaine.conf.template    # Server-specific (gitignored)
└── other-agent.conf.template    # Server-specific (gitignored)
```

To create a new agent proxy:
1. Copy `agent.conf.template.example` to `AGENT_NAME.conf.template`
2. Replace `AGENT_NAME` with your agent name
3. Set environment variables in `.env`:
   - `AGENT_NAME_TARGET_URL` - ngrok or service URL
   - `DISCORD_INVITE_URL` - Discord invite for error page

---

## Related Documentation

- [PROXY_MANAGEMENT.md](./PROXY_MANAGEMENT.md) - Comprehensive proxy management guide
- [Streamlit WebSocket Docs](https://docs.streamlit.io/develop/concepts/architecture/architecture#client-server-communication)
- [Nginx WebSocket Proxying](http://nginx.org/en/docs/http/websocket.html)
- [Traefik WebSocket Issues](https://github.com/traefik/traefik/issues/11405)
