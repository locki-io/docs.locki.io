# Troubleshooting Guide

Common issues and solutions for Vaettir n8n deployment.

## Quick Diagnostics

First steps when something isn't working:

```bash
# Check all container status
docker compose ps

# View all logs
docker compose logs --tail=100

# Check specific service
docker compose logs n8n --tail=50

# Check resource usage
docker stats

# Verify environment
docker compose exec n8n env | grep N8N
```

---

## Installation Issues

### Port 5678 not accessible (Local)

**Symptom**: Can't access http://localhost:5678

**Check**:

```bash
docker compose ps n8n
```

**Causes & Solutions**:

**1. Port not exposed**

```bash
# Verify docker-compose.override.yml exists
cat docker-compose.override.yml
```

Should contain:

```yaml
services:
  n8n:
    ports:
      - "${N8N_PORT:-5678}:5678"
```

If missing:

```bash
cat > docker-compose.override.yml << 'EOF'
services:
  n8n:
    ports:
      - "${N8N_PORT:-5678}:5678"
EOF

docker compose up -d
```

**2. Using HTTPS instead of HTTP**

- Use `http://localhost:5678` (not https)
- HTTPS only works with Traefik in production

**3. Container not running**

```bash
docker compose logs n8n
# Look for errors
```

**4. Port already in use**

```bash
# Check what's using port 5678
lsof -i :5678  # macOS/Linux
netstat -ano | findstr :5678  # Windows

# Change port in .env
echo "N8N_PORT=8080" >> .env
docker compose up -d
```

### Production HTTPS not working

**Symptom**: Can't access https://vaettir.locki.io

**Check DNS**:

```bash
dig vaettir.locki.io
# Should point to your server IP
```

**Check Traefik**:

```bash
docker compose logs traefik | grep -i certificate
```

**Common issues**:

**1. DNS not propagated**

- Wait up to 24h for DNS changes
- Use `nslookup vaettir.locki.io` to check

**2. Ports 80/443 not open**

```bash
# Check firewall
sudo ufw status

# Open if needed
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**3. Traefik not started**

```bash
# Verify production profile used
docker compose --profile production ps

# Restart
docker compose --profile production down
docker compose --profile production up -d
```

**4. Let's Encrypt rate limit**

- 5 failures per hour per domain
- Wait 1 hour and try again
- Check logs: `docker compose logs traefik`

---

## Python/JS Code Execution Issues

### "Python runner unavailable"

**Symptom**: Code node fails with "Python 3 is missing"

**Solution**: Task runner not configured

```bash
# Check if task runner is running
docker compose ps n8n-task-runner

# If not running
docker compose up -d n8n-task-runner

# Check logs
docker compose logs n8n-task-runner
```

**Verify configuration**:

```bash
docker compose exec n8n env | grep RUNNERS
```

Should show:

```
N8N_RUNNERS_ENABLED=true
N8N_RUNNERS_MODE=external
N8N_RUNNERS_BROKER_LISTEN_ADDRESS=0.0.0.0
```

### "Security violations detected"

**Symptom**: `Import of standard library module 'json' is disallowed`

**Cause**: Task runner permissions not configured

**Solution**:

1. Check if `n8n-task-runners.json` is mounted:

```bash
docker compose exec n8n-task-runner ls -la /etc/n8n-task-runners.json
```

2. Verify content:

```bash
docker compose exec n8n-task-runner cat /etc/n8n-task-runners.json
```

Should have:

```json
{
  "task-runners": [
    {
      "runner-type": "python",
      "env-overrides": {
        "N8N_RUNNERS_STDLIB_ALLOW": "*",
        "N8N_RUNNERS_EXTERNAL_ALLOW": "*"
      }
    }
  ]
}
```

3. If incorrect, verify file exists locally:

```bash
cat n8n-task-runners.json
```

4. Restart runner:

```bash
docker compose restart n8n-task-runner
```

### Task runner not connecting

**Symptom**: Code nodes timeout or fail silently

**Check connection**:

```bash
docker compose logs n8n-task-runner | grep -i connect
```

**Common issues**:

**1. Auth token mismatch**

```bash
# Check if tokens match
docker compose exec n8n env | grep N8N_RUNNERS_AUTH_TOKEN
docker compose exec n8n-task-runner env | grep N8N_RUNNERS_AUTH_TOKEN
```

Should be identical. If not:

```bash
nano .env
# Ensure N8N_RUNNERS_AUTH_TOKEN is set
docker compose restart n8n n8n-task-runner
```

**2. Broker not listening**

```bash
docker compose logs n8n | grep -i broker
```

Should see:

```
Task broker listening on 0.0.0.0:5679
```

If not, check:

```bash
docker compose exec n8n env | grep BROKER_LISTEN_ADDRESS
# Should be 0.0.0.0
```

**3. Network issues**

```bash
# Test connectivity
docker compose exec n8n-task-runner wget -O- http://n8n:5679/health
```

---

## Database Issues

### "Cannot connect to database"

**Symptom**: n8n fails to start with database error

**Check Postgres**:

```bash
docker compose ps postgres
# Should show "healthy"

docker compose logs postgres
```

**Solutions**:

**1. Database not ready**

```bash
# Wait for healthcheck
docker compose up -d postgres
sleep 10
docker compose up -d n8n
```

**2. Wrong credentials**

```bash
docker compose exec n8n env | grep DB_POSTGRESDB_PASSWORD
docker compose exec postgres env | grep POSTGRES_PASSWORD
```

Must match. If not:

```bash
nano .env
# Fix POSTGRES_PASSWORD
docker compose down
docker compose up -d
```

**3. Database corrupted**

```bash
# Restore from backup
docker compose down
docker volume rm vaettir_postgres_data
docker compose up -d postgres
docker compose exec -T postgres psql -U n8n n8n < backup.sql
docker compose up -d
```

### "Deadlock detected"

**Symptom**: Intermittent database errors under load

**Solutions**:

1. **Increase connection pool**:

```bash
# Add to .env
echo "DB_POSTGRESDB_POOL_SIZE=20" >> .env
docker compose restart n8n
```

2. **Enable queue mode** (already default):

```bash
# Verify
docker compose exec n8n env | grep EXECUTION_MODE
# Should be: N8N_EXECUTION_MODE=queue
```

3. **Reduce concurrent executions**:

```bash
echo "EXECUTIONS_PROCESS=5" >> .env
docker compose restart n8n
```

---

## Proxy Pattern Issues

### ngrok tunnel not reachable

**Symptom**: Production n8n can't reach local service

**Check ngrok**:

```bash
# On local machine
curl -I https://your-ngrok-url.ngrok-free.app
```

**Solutions**:

**1. ngrok not running**

```bash
# Start ngrok
ngrok http 8050
```

**2. Free tier banner**

- ngrok free tier shows warning page
- Visitors must click "Visit Site"
- Upgrade to paid or use different tunnel

**3. ngrok session expired**

```bash
# Check ngrok dashboard
# Restart tunnel with same config
ngrok http 8050
```

**4. Firewall blocking**

```bash
# Ensure ngrok can access localhost:8050
curl http://localhost:8050
```

### Proxy returns 502 Bad Gateway

**Symptom**: n8n workflow gets 502 from proxy

**Check proxy logs**:

```bash
docker compose logs ocapistaine
```

**Solutions**:

**1. Target URL wrong**

```bash
docker compose exec ocapistaine env | grep TARGET_URL
```

Should be valid ngrok URL. Update:

```bash
nano .env
# Fix OCAPISTAINE_TARGET_URL
docker compose --profile proxy restart ocapistaine
```

**2. ngrok tunnel down**

```bash
# Test from server
curl -I $OCAPISTAINE_TARGET_URL
```

**3. Local service not running**

```bash
# On local machine
docker compose ps
# Ensure your service is up
```

### Proxy not starting

**Symptom**: `docker compose ps` doesn't show proxy

**Cause**: Profile not enabled

**Solution**:

```bash
# Use --profile proxy flag
docker compose --profile proxy up -d ocapistaine

# Or add to .env (not recommended)
echo "COMPOSE_PROFILES=proxy" >> .env
docker compose up -d
```

---

## Performance Issues

### Workflows running slowly

**Check resource usage**:

```bash
docker stats
```

**Solutions**:

**1. Increase Docker resources**

- Docker Desktop → Settings → Resources
- Increase CPU/memory allocation

**2. Optimize workflows**

- Add batch processing
- Reduce concurrent executions
- Cache expensive operations

**3. Scale with workers**

Uncomment in `docker-compose.yml`:

```yaml
n8n-worker:
  # ... worker config
  deploy:
    replicas: 2
```

Restart:

```bash
docker compose --profile production up -d --scale n8n-worker=2
```

### High memory usage

**Check**:

```bash
docker stats n8n-1
```

**Solutions**:

**1. Limit executions data retention**

```bash
echo "EXECUTIONS_DATA_PRUNE=true" >> .env
echo "EXECUTIONS_DATA_MAX_AGE=168" >> .env  # 7 days
docker compose restart n8n
```

**2. Increase swap** (Linux):

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**3. Restart periodically**

```bash
# Add to cron
0 4 * * 0 cd ~/vaettir && docker compose restart n8n
```

### Database growing too large

**Check size**:

```bash
docker compose exec postgres psql -U n8n -d n8n -c "SELECT pg_size_pretty(pg_database_size('n8n'));"
```

**Solutions**:

**1. Enable pruning**:

```bash
echo "EXECUTIONS_DATA_PRUNE=true" >> .env
echo "EXECUTIONS_DATA_MAX_AGE=168" >> .env
docker compose restart n8n
```

**2. Manual cleanup**:

```bash
docker compose exec postgres psql -U n8n -d n8n
```

```sql
-- Delete executions older than 30 days
DELETE FROM execution_entity WHERE "startedAt" < NOW() - INTERVAL '30 days';

-- Vacuum database
VACUUM FULL;
```

---

## Observability Issues

### Opik traces not appearing

**Check n8n logs**:

```bash
docker compose logs n8n | grep -i hook
docker compose logs n8n | grep -i otel
```

**Solutions**:

**1. Observability not enabled**

```bash
docker compose exec n8n env | grep EXTERNAL_HOOK_FILES
```

Should show path to hooks. If empty:

```bash
nano .env
# Add: EXTERNAL_HOOK_FILES=/usr/local/lib/node_modules/n8n-observability/dist/hooks.cjs
docker compose restart n8n
```

**2. API key wrong**

```bash
docker compose exec n8n env | grep OPIK_API_KEY
```

Verify on https://www.comet.com

**3. Network blocked**

```bash
docker compose exec n8n wget -O- https://www.comet.com
```

If fails, check firewall.

### n8n won't start with observability

**Error**: "Problem loading external hook file"

**Solution**: Observability module not installed

```bash
# Rebuild with observability
docker compose build n8n --no-cache
docker compose up -d

# Or disable observability
nano .env
# Comment out EXTERNAL_HOOK_FILES
docker compose restart n8n
```

---

## Network Issues

### Can't access n8n from outside

**Production**: HTTPS not working

See "Production HTTPS not working" above.

**Local**: Should only be localhost

- Local dev is not meant to be publicly accessible
- Use ngrok if you need external access:

```bash
ngrok http 5678
```

### Webhooks not receiving data

**Check webhook URL**:

```bash
docker compose exec n8n env | grep WEBHOOK_URL
```

**Solutions**:

**1. Wrong webhook URL**

```bash
nano .env
# Set correct URL
# Production: WEBHOOK_URL=https://vaettir.locki.io/
# Local with ngrok: WEBHOOK_URL=https://abc.ngrok-free.app/
docker compose restart n8n
```

**2. Firewall blocking**

```bash
sudo ufw status
# Ensure 80/443 allowed
```

**3. Webhook path wrong**

- Check in sending service
- Should match n8n webhook node path

---

## Backup & Recovery

### Restore from backup

**Database restore**:

```bash
docker compose down
docker compose up -d postgres
sleep 5
docker compose exec -T postgres psql -U n8n n8n < backup.sql
docker compose up -d
```

### Backup failed / corrupted

**Create fresh backup**:

```bash
docker compose exec postgres pg_dump -U n8n -Fc n8n > backup-$(date +%Y%m%d).dump
```

**Test backup**:

```bash
# Restore to temp database
docker compose exec postgres createdb -U n8n test_restore
docker compose exec -T postgres pg_restore -U n8n -d test_restore < backup.dump
docker compose exec postgres dropdb -U n8n test_restore
```

---

## Docker Issues

### "No space left on device"

**Check disk space**:

```bash
df -h
docker system df
```

**Solutions**:

**1. Clean unused Docker resources**:

```bash
docker system prune -a
```

**2. Remove old images**:

```bash
docker image prune -a
```

**3. Rotate logs**:

```bash
# Add to /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

sudo systemctl restart docker
```

### Containers keep restarting

**Check logs**:

```bash
docker compose logs --tail=100
```

**Common causes**:

**1. Out of memory**

```bash
docker stats
```

Increase Docker memory limit.

**2. Config error**

```bash
# Validate docker-compose.yml
docker compose config
```

**3. Healthcheck failing**

```bash
docker compose ps
# Check HEALTH column
```

---

## Getting Help

### Enable Debug Logging

```bash
echo "N8N_LOG_LEVEL=debug" >> .env
docker compose restart n8n
docker compose logs -f n8n > debug.log
```

### Collect Diagnostics

```bash
#!/bin/bash
# Save as diagnose.sh

echo "=== Docker Compose Status ==="
docker compose ps

echo -e "\n=== n8n Logs ==="
docker compose logs n8n --tail=50

echo -e "\n=== Task Runner Logs ==="
docker compose logs n8n-task-runner --tail=30

echo -e "\n=== Environment ==="
docker compose exec n8n env | grep N8N

echo -e "\n=== Disk Space ==="
df -h

echo -e "\n=== Docker Resources ==="
docker stats --no-stream
```

Run and share output when asking for help.

### Where to Get Help

1. **Check this guide first**
2. **n8n Community Forum**: https://community.n8n.io
3. **n8n Documentation**: https://docs.n8n.io
4. **GitHub Issues**: https://github.com/n8n-io/n8n/issues
5. **Discord**: https://discord.gg/n8n

### Reporting Bugs

Include:

- Vaettir version (git commit hash)
- n8n version: `docker compose exec n8n n8n --version`
- Error messages (full logs)
- Steps to reproduce
- Environment (local/production)

---

## Prevention

### Monitoring

Set up monitoring:

```bash
# Add healthcheck endpoint monitoring
# Use UptimeRobot, Pingdom, or similar
# Monitor: https://vaettir.locki.io/healthz
```

### Automated Backups

Add to crontab:

```bash
0 2 * * * cd ~/vaettir && docker compose exec postgres pg_dump -U n8n n8n > ~/backups/n8n-$(date +\%Y\%m\%d).sql
0 3 * * * find ~/backups -name "n8n-*.sql" -mtime +7 -delete
```

### Updates

Stay current:

```bash
# Monthly update routine
cd ~/vaettir
git pull
docker compose build --pull
docker compose --profile production down
docker compose --profile production up -d
```

### Security

- Keep Docker updated
- Rotate credentials quarterly
- Monitor logs for suspicious activity
- Use strong passwords
- Enable 2FA where possible

---

## Next Steps

- [Setup Guide](./SETUP.md) - Proper installation
- [Architecture](./ARCHITECTURE.md) - Understand the system
- [Development](./DEVELOPMENT.md) - Dev workflow tips
