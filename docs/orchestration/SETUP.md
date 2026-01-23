# Vaettir Setup Guide

Complete installation and configuration instructions for local development and production deployment.

## Prerequisites

### Required

- Docker Desktop (Mac/Windows) or Docker Engine (Linux)
- Docker Compose v2+
- Git
- Text editor

### Optional

- ngrok account (for development with local services)
- Opik account (for observability)
- Domain name (for production HTTPS)

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd vaettir
```

### 2. Choose Your Environment

You have two main deployment scenarios:

- **Local Development** - For building/testing workflows on your machine
- **Production Server** - For running vaettir on a public server

---

## Local Development Setup

Perfect for workflow development and testing.

### Step 1: Environment Configuration

```bash
# Copy the development template
cp .env.development.example .env

# Edit the file (optional - defaults work fine)
nano .env
```

**Key variables** (defaults are fine for local):
```bash
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_LOG_LEVEL=debug

# Database
POSTGRES_PASSWORD=dev_password_not_secure

# Task Runner
N8N_RUNNERS_AUTH_TOKEN=dev_runner_token_local

# Encryption (change if you want)
N8N_ENCRYPTION_KEY=dev_super_secret_change_me_still
```

### Step 2: Port Exposure (Automatic)

The `docker-compose.override.yml` file automatically exposes port 5678:

```yaml
# This file is gitignored and auto-merged
services:
  n8n:
    ports:
      - "${N8N_PORT:-5678}:5678"
```

If it doesn't exist, create it:
```bash
cat > docker-compose.override.yml << 'EOF'
services:
  n8n:
    ports:
      - "${N8N_PORT:-5678}:5678"
EOF
```

### Step 3: Start Services

```bash
# Build and start
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f n8n
```

### Step 4: Access n8n

Open your browser to: **http://localhost:5678**

On first access:
1. Create owner account (email + password)
2. This becomes your admin user

### Step 5: Basic Auth (Optional)

If you enabled basic auth in `.env`:
- Username: `dev`
- Password: `dev`

Then proceed to create your owner account.

### Verify Installation

Check all services are healthy:
```bash
docker compose ps
```

Expected output:
```
NAME                        STATUS
vaettir-n8n-1               Up (healthy)
vaettir-n8n-task-runner-1   Up
vaettir-postgres-1          Up (healthy)
vaettir-redis-1             Up (healthy)
```

### Test Python Execution

1. Create new workflow in n8n
2. Add "Code" node
3. Select "Run Once for All Items"
4. Choose "Python" as language
5. Test code:
```python
import json
import re

data = {
    "message": "Python task runner works!",
    "modules": ["json", "re"]
}

return [{"json": data}]
```
6. Execute - should succeed without "Security violations"

---

## Production Server Setup

For deploying to a public server with HTTPS.

### Prerequisites

- Linux server (Ubuntu/Debian recommended)
- Domain name pointing to server IP
- Ports 80 and 443 open
- SSH access to server

### Step 1: Server Preparation

```bash
# SSH to your server
ssh user@your-server

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo apt install docker-compose-plugin

# Log out and back in for group changes
exit
ssh user@your-server
```

### Step 2: Clone Repository

```bash
# Create project directory
mkdir -p ~/vaettir
cd ~/vaettir

# Clone (or upload via git)
git clone <repository-url> .
```

### Step 3: Environment Configuration

```bash
# Copy production template
cp .env.production.example .env

# Edit configuration
nano .env
```

**Critical variables to set**:
```bash
# Domain (MUST match your DNS)
N8N_HOST=vaettir.locki.io
N8N_PROTOCOL=https

# Security - CHANGE THESE!
POSTGRES_PASSWORD=<generate-strong-password>
N8N_ENCRYPTION_KEY=<generate-long-random-string>
N8N_RUNNERS_AUTH_TOKEN=<generate-random-token>

# Traefik (for Let's Encrypt)
TRAEFIK_EMAIL=your-email@domain.com

# Auth (optional but recommended)
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<strong-password>
```

**Generate secure values**:
```bash
# Encryption key (32+ chars)
openssl rand -hex 32

# Auth token
openssl rand -base64 32

# Password
openssl rand -base64 16
```

### Step 4: Ensure Clean Production Config

**IMPORTANT**: Make sure `docker-compose.override.yml` does NOT exist on server:

```bash
# Check if it exists
ls -la docker-compose.override.yml

# If it exists, delete it
rm docker-compose.override.yml
```

This file should only exist on local dev machines (it's gitignored).

### Step 5: Start with Production Profile

```bash
# Build and start with production profile
docker compose --profile production up -d --build

# Check status
docker compose ps

# Watch logs
docker compose logs -f
```

### Step 6: Verify HTTPS

Wait 1-2 minutes for Let's Encrypt certificate:

```bash
# Check Traefik logs
docker compose logs traefik

# Should see: "Certificate obtained for domain vaettir.locki.io"
```

Access: **https://vaettir.locki.io**

### Step 7: Initial Setup

1. Enter basic auth credentials (if enabled)
2. Create owner account (first user)
3. Configure n8n settings

### Production Checklist

- [ ] DNS points to server IP
- [ ] Ports 80/443 open in firewall
- [ ] Strong passwords set in `.env`
- [ ] `.env` file has restricted permissions: `chmod 600 .env`
- [ ] `docker-compose.override.yml` does NOT exist
- [ ] HTTPS certificate obtained successfully
- [ ] Backups configured (see below)

---

## Optional: Opik Observability

Enable LLM tracing and monitoring.

### Step 1: Get Opik API Key

1. Sign up at https://www.comet.com/signup?product=opik
2. Create workspace
3. Get API key from settings

### Step 2: Configure Environment

Add to `.env`:
```bash
# Opik Observability
OPIK_API_KEY=your_api_key_here
OPIK_WORKSPACE=default
OTEL_EXPORTER_OTLP_ENDPOINT=https://www.comet.com/opik/api/v1/private/otel
OTEL_EXPORTER_OTLP_HEADERS=Authorization=${OPIK_API_KEY},Comet-Workspace=${OPIK_WORKSPACE}
N8N_OTEL_SERVICE_NAME=vaettir-n8n
EXTERNAL_HOOK_FILES=/usr/local/lib/node_modules/n8n-observability/dist/hooks.cjs
```

### Step 3: Restart

```bash
docker compose restart n8n
```

Executions will now be traced in Opik dashboard.

**Recommendation**: Only enable in production, not local dev.

---

## Backup and Restore

### Backup

**Database backup**:
```bash
# Create backup directory
mkdir -p ~/backups

# Backup PostgreSQL
docker compose exec postgres pg_dump -U n8n n8n > ~/backups/n8n-$(date +%Y%m%d).sql

# Backup volumes
docker run --rm \
  -v vaettir_postgres_data:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz /data

docker run --rm \
  -v vaettir_n8n_data:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/n8n-data-$(date +%Y%m%d).tar.gz /data
```

**Environment backup**:
```bash
cp .env ~/backups/.env.backup-$(date +%Y%m%d)
```

### Restore

**Database restore**:
```bash
# Stop services
docker compose down

# Restore from SQL dump
docker compose up -d postgres
docker compose exec -T postgres psql -U n8n n8n < ~/backups/n8n-YYYYMMDD.sql

# Restart all services
docker compose --profile production up -d
```

### Automated Backups

Create cron job:
```bash
crontab -e
```

Add:
```cron
# Daily backup at 2 AM
0 2 * * * cd ~/vaettir && docker compose exec postgres pg_dump -U n8n n8n > ~/backups/n8n-$(date +\%Y\%m\%d).sql

# Keep only last 7 days
0 3 * * * find ~/backups -name "n8n-*.sql" -mtime +7 -delete
```

---

## Updating Vaettir

### Development

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build
```

### Production

```bash
# Pull changes
cd ~/vaettir
git pull

# Backup first!
docker compose exec postgres pg_dump -U n8n n8n > ~/backups/pre-update-$(date +%Y%m%d).sql

# Update
docker compose --profile production down
docker compose --profile production up -d --build

# Check logs
docker compose logs -f n8n
```

---

## Common Configurations

### Custom Port (Local)

Edit `docker-compose.override.yml`:
```yaml
services:
  n8n:
    ports:
      - "8080:5678"  # Access via localhost:8080
```

### Multiple Domains (Production)

Edit Traefik labels in `docker-compose.yml`:
```yaml
labels:
  - "traefik.http.routers.n8n.rule=Host(`vaettir.locki.io`) || Host(`n8n.example.com`)"
```

### Enable Workers (Scaling)

Uncomment in `docker-compose.yml`:
```yaml
n8n-worker:
  image: n8nio/n8n:latest
  command: n8n worker
  # ... rest of config
  deploy:
    replicas: 2  # Number of workers
```

Then:
```bash
docker compose --profile production up -d --scale n8n-worker=2
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md) - Understand how it works
- [Development Workflow](./DEVELOPMENT.md) - Set up local service integration
- [Workflow Best Practices](./WORKFLOWS.md) - Create effective workflows
- [External Resources](./REFERENCES.md) - Links to n8n documentation

## Security Notes

### Production Security Checklist

- [ ] Use strong, unique passwords
- [ ] Restrict `.env` file permissions: `chmod 600 .env`
- [ ] Enable basic auth or configure SSO
- [ ] Keep Docker and images updated
- [ ] Use firewall (UFW/iptables)
- [ ] Regular backups
- [ ] Monitor logs for suspicious activity
- [ ] Rotate API keys periodically
- [ ] Use webhook secrets for external integrations

### Network Security

```bash
# Install UFW (Ubuntu)
sudo apt install ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### SSL/TLS

Traefik handles this automatically via Let's Encrypt. Certificates are:
- Stored in `traefik_data` volume
- Auto-renewed before expiration
- Grade A SSL by default

To verify:
```bash
# Check certificate
echo | openssl s_client -connect vaettir.locki.io:443 2>/dev/null | openssl x509 -noout -dates
```
