# External Resources

Comprehensive list of documentation, tools, and resources for Vaettir and related technologies.

## n8n Documentation

### Official Documentation

- **Main Documentation**: https://docs.n8n.io
- **Getting Started**: https://docs.n8n.io/getting-started/
- **Hosting**: https://docs.n8n.io/hosting/
- **Workflows**: https://docs.n8n.io/workflows/
- **Nodes Reference**: https://docs.n8n.io/integrations/builtin/

### n8n Specific Topics

**Installation & Deployment**

- Docker Installation: https://docs.n8n.io/hosting/installation/docker/
- Docker Compose: https://docs.n8n.io/hosting/installation/server-setups/docker-compose/
- Environment Variables: https://docs.n8n.io/hosting/configuration/environment-variables/
- Configuration: https://docs.n8n.io/hosting/configuration/

**Task Runners (Code Execution)**

- Task Runners Overview: https://docs.n8n.io/hosting/configuration/task-runners/
- Task Runner Environment Variables: https://docs.n8n.io/hosting/configuration/environment-variables/task-runners/
- Code Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/
- Python in n8n: https://docs.n8n.io/code/python/

**Architecture & Scaling**

- Architecture Overview: https://docs.n8n.io/hosting/architecture/
- Scaling: https://docs.n8n.io/hosting/scaling/
- Queue Mode: https://docs.n8n.io/hosting/scaling/queue-mode/
- Worker Processes: https://docs.n8n.io/hosting/scaling/queue-mode/#worker-processes

**Security**

- Security Guide: https://docs.n8n.io/hosting/security/
- Credentials: https://docs.n8n.io/credentials/
- Webhook Security: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/#webhook-security

### Community & Support

- **Community Forum**: https://community.n8n.io
- **Discord**: https://discord.gg/n8n
- **GitHub**: https://github.com/n8n-io/n8n
- **Workflow Templates**: https://n8n.io/workflows
- **YouTube Channel**: https://www.youtube.com/@n8n-io

### Tutorials & Guides

- **n8n Blog**: https://blog.n8n.io
- **Course: Getting Started**: https://docs.n8n.io/courses/level-one/
- **Course: Advanced**: https://docs.n8n.io/courses/level-two/
- **Example Workflows**: https://n8n.io/workflows

---

## Opik (Observability)

### Official Documentation

- **Main Documentation**: https://www.comet.com/docs/opik
- **Getting Started**: https://www.comet.com/docs/opik/tracing/log_traces
- **n8n Integration**: https://www.comet.com/docs/opik/integrations/n8n

### Opik Resources

- **Sign Up**: https://www.comet.com/signup?product=opik
- **Dashboard**: https://www.comet.com
- **GitHub**: https://github.com/comet-ml/opik
- **n8n-observability Package**: https://github.com/comet-ml/n8n-observability

### OpenTelemetry

- **OpenTelemetry Docs**: https://opentelemetry.io/docs/
- **OTLP Specification**: https://opentelemetry.io/docs/specs/otlp/
- **Python SDK**: https://opentelemetry.io/docs/languages/python/

---

## Docker & Infrastructure

### Docker Documentation

- **Docker Docs**: https://docs.docker.com
- **Docker Compose**: https://docs.docker.com/compose/
- **Compose File Reference**: https://docs.docker.com/compose/compose-file/
- **Dockerfile Reference**: https://docs.docker.com/reference/dockerfile/
- **Best Practices**: https://docs.docker.com/develop/dev-best-practices/

### Docker Images Used

- **n8n**: https://hub.docker.com/r/n8nio/n8n
- **n8n Runners**: https://hub.docker.com/r/n8nio/runners
- **PostgreSQL**: https://hub.docker.com/_/postgres
- **Redis**: https://hub.docker.com/_/redis
- **Traefik**: https://hub.docker.com/_/traefik
- **nginx**: https://hub.docker.com/_/nginx

### Traefik (Reverse Proxy)

- **Traefik Docs**: https://doc.traefik.io/traefik/
- **Docker Provider**: https://doc.traefik.io/traefik/providers/docker/
- **Let's Encrypt**: https://doc.traefik.io/traefik/https/acme/
- **Routers**: https://doc.traefik.io/traefik/routing/routers/
- **Middlewares**: https://doc.traefik.io/traefik/middlewares/overview/

---

## ngrok & Tunneling

### ngrok Documentation

- **ngrok Docs**: https://ngrok.com/docs
- **Getting Started**: https://ngrok.com/docs/getting-started/
- **HTTP Tunnels**: https://ngrok.com/docs/http/
- **ngrok Agent Config**: https://ngrok.com/docs/agent/config/
- **Docker Extension**: https://ngrok.com/blog/docker-desktop-extension

### ngrok Resources

- **Dashboard**: https://dashboard.ngrok.com
- **Pricing**: https://ngrok.com/pricing
- **Download**: https://ngrok.com/download
- **Blog Post (Docker Extension)**: https://ngrok.com/blog/docker-desktop-extension

### Alternatives

- **Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Tailscale**: https://tailscale.com/kb/
- **localhost.run**: https://localhost.run
- **Localtunnel**: https://github.com/localtunnel/localtunnel

---

## Database (PostgreSQL)

### PostgreSQL Documentation

- **Official Docs**: https://www.postgresql.org/docs/
- **Docker Guide**: https://hub.docker.com/_/postgres
- **pg_dump**: https://www.postgresql.org/docs/current/app-pgdump.html
- **Backup & Recovery**: https://www.postgresql.org/docs/current/backup.html

### Tools

- **pgAdmin**: https://www.pgadmin.org
- **DBeaver**: https://dbeaver.io
- **psql CLI**: https://www.postgresql.org/docs/current/app-psql.html

---

## Redis (Queue)

### Redis Documentation

- **Redis Docs**: https://redis.io/docs/
- **Docker Guide**: https://hub.docker.com/_/redis
- **Redis CLI**: https://redis.io/docs/manual/cli/
- **Persistence**: https://redis.io/docs/management/persistence/

---

## Integration Services

### ocapistaine (Moderation Service)

- **GitHub Repository**: https://github.com/locki-io/ocapistaine
- **Documentation**: See repository README

### GitHub

- **Webhooks**: https://docs.github.com/en/webhooks
- **API**: https://docs.github.com/en/rest
- **Webhook Security**: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries

### Facebook Graph API

- **Graph API Docs**: https://developers.facebook.com/docs/graph-api
- **Webhooks**: https://developers.facebook.com/docs/graph-api/webhooks

---

## Development Tools

### Version Control

- **Git**: https://git-scm.com/doc
- **GitHub**: https://docs.github.com
- **Git Best Practices**: https://git-scm.com/book/en/v2

### Code Editors

- **VS Code**: https://code.visualstudio.com/docs
- **Docker Extension**: https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker
- **Remote SSH**: https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh

### Terminal Tools

- **htop**: https://htop.dev
- **docker compose**: https://docs.docker.com/compose/reference/
- **curl**: https://curl.se/docs/
- **jq**: https://jqlang.github.io/jq/manual/

---

## Security

### SSL/TLS

- **Let's Encrypt**: https://letsencrypt.org/docs/
- **SSL Labs Test**: https://www.ssllabs.com/ssltest/
- **Certificate Transparency**: https://certificate.transparency.dev

### Security Best Practices

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Docker Security**: https://docs.docker.com/engine/security/
- **n8n Security**: https://docs.n8n.io/hosting/security/

### Password/Secret Management

- **1Password**: https://1password.com
- **Bitwarden**: https://bitwarden.com
- **openssl**: https://www.openssl.org/docs/

---

## Monitoring & Logging

### Monitoring Tools

- **Uptime Robot**: https://uptimerobot.com
- **Pingdom**: https://www.pingdom.com
- **Grafana**: https://grafana.com/docs/
- **Prometheus**: https://prometheus.io/docs/

### Log Management

- **Loki**: https://grafana.com/docs/loki/
- **ELK Stack**: https://www.elastic.co/what-is/elk-stack
- **Papertrail**: https://www.papertrail.com

### APM Alternatives to Opik

- **Datadog**: https://docs.datadoghq.com/tracing/
- **New Relic**: https://docs.newrelic.com/docs/apm/
- **Honeycomb**: https://docs.honeycomb.io
- **Jaeger**: https://www.jaegertracing.io/docs/
- **Zipkin**: https://zipkin.io

---

## Server Management

### Linux System Administration

- **Ubuntu Server**: https://ubuntu.com/server/docs
- **systemd**: https://systemd.io
- **ufw Firewall**: https://help.ubuntu.com/community/UFW
- **SSH**: https://www.openssh.com/manual.html

### Automation

- **Cron**: https://man7.org/linux/man-pages/man5/crontab.5.html
- **Ansible**: https://docs.ansible.com
- **Terraform**: https://developer.hashicorp.com/terraform/docs

---

## Learning Resources

### Docker & Containers

- **Docker Tutorial**: https://docker-curriculum.com
- **Docker Mastery Course**: https://www.udemy.com/course/docker-mastery/
- **Play with Docker**: https://labs.play-with-docker.com

### n8n

- **n8n Academy**: https://docs.n8n.io/courses/
- **n8n YouTube**: https://www.youtube.com/@n8n-io
- **Community Tutorials**: https://community.n8n.io/c/tutorials/

### Python

- **Python Docs**: https://docs.python.org/3/
- **Real Python**: https://realpython.com
- **Python Package Index**: https://pypi.org

### JavaScript

- **MDN Web Docs**: https://developer.mozilla.org/en-US/docs/Web/JavaScript
- **JavaScript.info**: https://javascript.info
- **Node.js Docs**: https://nodejs.org/docs/

---

## API Testing

### Tools

- **Postman**: https://www.postman.com
- **Insomnia**: https://insomnia.rest
- **curl**: https://curl.se/docs/
- **HTTPie**: https://httpie.io/docs/cli

### Webhook Testing

- **Webhook.site**: https://webhook.site
- **RequestBin**: https://requestbin.com
- **ngrok Inspector**: http://localhost:4040 (when running ngrok)

---

## Cloud Providers

### Popular Options

- **Hetzner**: https://docs.hetzner.com
- **DigitalOcean**: https://docs.digitalocean.com
- **Linode (Akamai)**: https://www.linode.com/docs/
- **AWS**: https://docs.aws.amazon.com
- **Google Cloud**: https://cloud.google.com/docs
- **Azure**: https://docs.microsoft.com/azure/

---

## Troubleshooting Resources

### Community Help

- **n8n Community**: https://community.n8n.io
- **Stack Overflow (n8n)**: https://stackoverflow.com/questions/tagged/n8n
- **Docker Forums**: https://forums.docker.com
- **Server Fault**: https://serverfault.com

### Status Pages

- **n8n Cloud Status**: https://status.n8n.io
- **GitHub Status**: https://www.githubstatus.com
- **Docker Hub Status**: https://status.docker.com

---

## Related Projects

### Workflow Automation

- **Apache Airflow**: https://airflow.apache.org
- **Prefect**: https://www.prefect.io
- **Zapier**: https://zapier.com
- **Make (Integromat)**: https://www.make.com

### Self-Hosted Alternatives

- **Windmill**: https://www.windmill.dev
- **Automatisch**: https://automatisch.io
- **Activepieces**: https://www.activepieces.com

---

## Vaettir Documentation

### Internal Docs

- [Documentation Index](./INDEX.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Setup Guide](./SETUP.md)
- [Development Workflow](./DEVELOPMENT.md)
- [Workflow Best Practices](./WORKFLOWS.md)
- [Observability Guide](./OBSERVABILITY.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Project Files

- **Main README on vaettir**: [Private repo Vaettir](https://github.com/locki-io/vaettir/)
- **Usage Guide**: [./USAGE.md](./USAGE.md)

---

## Useful Commands Cheatsheet

### Docker Compose

```bash
# Start services
docker compose up -d

# Start with profile
docker compose --profile production up -d

# View logs
docker compose logs -f

# Restart service
docker compose restart n8n

# Stop all
docker compose down

# Rebuild
docker compose build --no-cache
```

### Docker

```bash
# List containers
docker ps

# Container logs
docker logs -f container_name

# Execute command
docker exec -it container_name bash

# Stats
docker stats

# Clean up
docker system prune -a
```

### PostgreSQL

```bash
# Connect to database
docker compose exec postgres psql -U n8n

# Dump database
docker compose exec postgres pg_dump -U n8n n8n > backup.sql

# Restore database
docker compose exec -T postgres psql -U n8n n8n < backup.sql
```

### System

```bash
# Check disk space
df -h

# Check memory
free -h

# Check processes
htop

# Check ports
netstat -tlnp
lsof -i :5678
```

---

## Contributing

To add resources to this list:

1. Verify link is active
2. Add to appropriate section
3. Keep descriptions concise
4. Maintain alphabetical order within sections

## Updates

This reference guide is maintained alongside Vaettir. Last updated: 2026-01-22

For the latest official documentation, always refer to the original sources linked above.
