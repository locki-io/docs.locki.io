# Port Management

Complete reference for all ports used in the Vaettir system.

## Port Overview

| Service | Internal Port | External Port | Protocol | Notes |
|---------|--------------|---------------|----------|-------|
| Traefik (HTTP) | 80 | 80 | HTTP | Redirects to HTTPS |
| Traefik (HTTPS) | 443 | 443 | HTTPS | Main entry point |
| n8n Web UI | 5678 | via Traefik | HTTP | Internal only |
| n8n Task Broker | 5679 | - | HTTP | Task runner communication |
| PostgreSQL | 5432 | - | TCP | Database (internal only) |
| Redis | 6379 | - | TCP | Queue (internal only) |
| ocapistaine proxy | 80 | via Traefik | HTTP | Nginx proxy to ngrok/local |
| ocapistaine (local) | 8050 | - | HTTP | Your local dev machine |

## Production Configuration

### External Access (via Traefik)
```
https://vaettir.locki.io → Traefik:443 → n8n:5678
https://ocapistaine.vaettir.locki.io → Traefik:443 → ocapistaine:80 → ngrok (ocapistaine.ngrok-free.app) → localhost:8050
```

### Internal Docker Network
Services communicate via Docker DNS:
```
n8n → postgres:5432
n8n → redis:6379
n8n → n8n-task-runner:5679 (task broker)
n8n → ocapistaine:80 (proxy service)
```

### Workflow HTTP Calls
From n8n workflows, always use internal service names:
```
http://ocapistaine:80/api/v1/validate
```

## Development Configuration

### Local Services
```
localhost:5678 → n8n (via docker-compose.override.yml)
localhost:8050 → ocapistaine (your local machine)
```

### Ngrok Tunnel

**With Custom Domain (Paid Plan)**
```bash
ngrok http 8050 --domain=ocapistaine.ngrok-free.app
# Creates tunnel: https://ocapistaine.ngrok-free.app → localhost:8050
# URL stays constant - no need to update configuration
```

**Without Custom Domain (Free Plan)**
```bash
ngrok http 8050
# Creates tunnel: https://abc123.ngrok-free.app → localhost:8050
# URL changes on restart - must update production config
```

### Environment Variables
```bash
# Production .env (with custom ngrok domain)
OCAPISTAINE_TARGET_URL=https://ocapistaine.ngrok-free.app

# Production .env (with free plan - update when ngrok URL changes)
OCAPISTAINE_TARGET_URL=https://abc123.ngrok-free.app
```

## Port Conflicts

### Common Issues

**Port 8000 vs 8050**:
- Port 8000 is commonly used by Django, Python HTTP servers
- ocapistaine uses **port 8050** to avoid conflicts
- Always use 8050 for ocapistaine local development

**Port 5678 (n8n)**:
- Only exposed locally via docker-compose.override.yml
- Never exposed in production (Traefik handles routing)

**Port 80/443 (Traefik)**:
- Only used in production profile
- Requires root or Docker to bind to privileged ports
- Handles SSL certificates automatically

## Checking Port Usage

### On Production Server
```bash
# Check which ports are listening
ssh <user>@<server> 'sudo netstat -tulpn | grep LISTEN'

# Check specific service
ssh <user>@<server> 'docker compose ps'

# Check Traefik routing
ssh <user>@<server> 'docker compose logs traefik | grep -i router'
```

### On Local Machine
```bash
# Check what's listening on port 8050
lsof -i :8050

# Check what's listening on port 5678
lsof -i :5678

# Check ngrok tunnels
curl http://localhost:4040/api/tunnels
```

## Firewall Configuration

### Production Server (vaettir.locki.io)

Required open ports:
- **22**: SSH access
- **80**: HTTP (Traefik - redirects to HTTPS)
- **443**: HTTPS (Traefik - main entry)

Blocked ports (internal only):
- 5432 (PostgreSQL)
- 6379 (Redis)
- 5678 (n8n)
- 5679 (n8n task broker)

### Typical UFW Configuration
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## Adding New Services

When adding a new proxy service:

1. **Choose internal port** (avoid conflicts)
2. **Update docker-compose.yml** with Traefik labels
3. **Add subdomain** to DNS (e.g., service.vaettir.locki.io)
4. **Document in this file**

### Example: Adding a new service on port 8060

```yaml
myservice:
  build:
    context: .
    dockerfile: Dockerfile.proxy-myservice
  restart: always
  environment:
    - MYSERVICE_TARGET_URL=${MYSERVICE_TARGET_URL:-http://host.docker.internal:8060}
  profiles: ["proxy"]
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.myservice.rule=Host(`myservice.vaettir.locki.io`)"
    - "traefik.http.routers.myservice.entrypoints=websecure"
    - "traefik.http.routers.myservice.tls=true"
    - "traefik.http.routers.myservice.tls.certresolver=myresolver"
    - "traefik.http.services.myservice.loadbalancer.server.port=80"
```

## Troubleshooting

### Service not accessible

1. **Check container is running**:
   ```bash
   docker compose ps myservice
   ```

2. **Check Traefik labels**:
   ```bash
   docker inspect myservice | grep -A 10 Labels
   ```

3. **Check Traefik logs**:
   ```bash
   docker compose logs traefik | grep myservice
   ```

4. **Check DNS**:
   ```bash
   nslookup myservice.vaettir.locki.io
   ```

5. **Check firewall**:
   ```bash
   sudo ufw status
   ```

### Port conflict

1. **Find what's using the port**:
   ```bash
   lsof -i :8050
   # or
   sudo netstat -tulpn | grep 8050
   ```

2. **Stop the conflicting service** or **choose a different port**

3. **Update configuration** in .env and restart

## References

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Docker Networking](https://docs.docker.com/network/)
- [n8n Docker Setup](https://docs.n8n.io/hosting/installation/docker/)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow with ngrok
