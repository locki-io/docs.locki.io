# Vaettir Architecture

## Overview

Vaettir is a self-hosted n8n automation platform with enhanced capabilities for:

- Python/JavaScript code execution via isolated task runners
- Optional LLM observability via Opik
- Development proxy pattern for local service integration
- Production-ready deployment with Traefik reverse proxy

## System Components

### Core Services

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Server                         │
│                   (vaettir.locki.io)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐                                               │
│  │ Traefik  │ ← HTTPS (443)                                │
│  │ Reverse  │                                               │
│  │  Proxy   │                                               │
│  └────┬─────┘                                               │
│       │                                                      │
│       ├──────────────────┐                                  │
│       ↓                  ↓                                   │
│  ┌─────────┐      ┌──────────┐                             │
│  │   n8n   │←────→│  Proxy   │ (optional)                  │
│  │  Main   │      │ Services │                              │
│  │ Server  │      └────┬─────┘                             │
│  └────┬────┘           │                                    │
│       │                │                                     │
│       ├────────────────┼─────────────────┐                 │
│       ↓                ↓                 ↓                  │
│  ┌─────────┐    ┌──────────┐      ┌──────────┐            │
│  │ Task    │    │ Postgres │      │  Redis   │            │
│  │ Runner  │    │    DB    │      │  Queue   │            │
│  └─────────┘    └──────────┘      └──────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                         │
                         │ ngrok tunnel (dev only)
                         ↓
              ┌──────────────────────┐
              │   Local Machine      │
              │  (Development)       │
              ├──────────────────────┤
              │  • ocapistaine       │
              │  • Other services    │
              └──────────────────────┘
```

## Component Details

### 1. n8n Main Server

**Image**: Custom build from `n8nio/n8n:latest` + `n8n-observability`

**Responsibilities**:

- Workflow execution orchestration
- Webhook endpoints
- User interface (port 5678)
- API endpoints
- Workflow data storage (via Postgres)
- Queue management (via Redis in queue mode)

**Configuration**:

- Database: PostgreSQL for persistent storage
- Execution mode: Queue (for scalability)
- Task runners: External mode (isolated code execution)

**Environment Variables** (key ones):

```bash
N8N_HOST=vaettir.locki.io
N8N_PROTOCOL=https
DB_TYPE=postgresdb
N8N_EXECUTION_MODE=queue
N8N_RUNNERS_ENABLED=true
N8N_RUNNERS_MODE=external
```

### 2. Task Runner

**Image**: `n8nio/runners:latest`

**Purpose**: Executes user-provided Python and JavaScript code in isolation

**Security Features**:

- Runs in separate container from n8n
- Module allow/deny lists via `n8n-task-runners.json`
- Sandboxed execution environment

**Communication**:

- Connects to n8n via WebSocket on port 5679
- Authentication via `N8N_RUNNERS_AUTH_TOKEN`

**Configuration File**: `/etc/n8n-task-runners.json`

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

### 3. PostgreSQL Database

**Image**: `postgres:16-alpine`

**Stores**:

- Workflow definitions
- Execution history
- Credentials (encrypted)
- User settings
- Webhook registrations

**Persistence**: `postgres_data` Docker volume

### 4. Redis Queue

**Image**: `redis:7-alpine`

**Purpose**:

- Job queue for workflow executions
- Enables horizontal scaling with workers
- Currently used in queue mode

**Note**: Workers are currently disabled but can be enabled for multi-instance scaling.

### 5. Traefik Reverse Proxy

**Profile**: `production` only

**Responsibilities**:

- HTTPS termination (Let's Encrypt)
- Routing requests to n8n
- Certificate management
- Access control

**Configuration**:

- Automatic HTTPS via ACME (Let's Encrypt)
- Routes `vaettir.locki.io` → n8n:5678
- Stores certificates in `traefik_data` volume

### 6. Proxy Services (Optional)

**Image**: Custom nginx proxy (`Dockerfile.proxy`)

**Purpose**: Route n8n workflow HTTP requests to external services

**Use Cases**:

- Development: Route to ngrok tunnel → local machine
- Production: Route to real containerized services
- Multiple services: ocapistaine, future integrations

**Example**:

```yaml
# n8n workflow calls: http://ocapistaine:8000
# Proxy routes to: https://abc123.ngrok-free.app (dev)
# or: http://ocapistaine-real:8000 (prod)
```

## Data Flow

### Workflow Execution (Standard)

```
1. User/Webhook triggers workflow
   ↓
2. n8n receives request
   ↓
3. n8n queues execution (Redis)
   ↓
4. n8n worker picks up job
   ↓
5. For Code nodes:
   - Task sent to Task Runner via WebSocket
   - Runner executes Python/JS in sandbox
   - Results returned to n8n
   ↓
6. Workflow completes
   ↓
7. Results stored in Postgres
   ↓
8. Optional: Execution trace sent to Opik
```

### Development with Proxy Pattern

```
1. n8n workflow calls: http://ocapistaine:8000/moderate
   ↓
2. Docker resolves "ocapistaine" to proxy service
   ↓
3. Nginx proxy reads OCAPISTAINE_TARGET_URL from env
   ↓
4. Proxy forwards to: https://abc123.ngrok-free.app
   ↓
5. ngrok tunnel routes to: localhost:8050
   ↓
6. Local ocapistaine processes request
   ↓
7. Response flows back through tunnel → proxy → n8n
```

## Environment Modes

### Local Development

**Characteristics**:

- Port 5678 exposed directly to host (`docker-compose.override.yml`)
- Traefik disabled
- Debug logging enabled
- Optional: Proxy services for ngrok integration

**Access**: `http://localhost:5678`

**Docker Compose**:

```bash
docker compose up -d
# Automatically merges docker-compose.yml + docker-compose.override.yml
```

### Production

**Characteristics**:

- Traefik enabled via `--profile production`
- Port 5678 NOT exposed (Traefik routes internally)
- HTTPS with automatic certificates
- Production logging level

**Access**: `https://vaettir.locki.io`

**Docker Compose**:

```bash
docker compose --profile production up -d
```

## Security Architecture

### Network Isolation

- n8n not directly exposed in production (Traefik only)
- Task runner can't access host network
- Database and Redis only accessible within Docker network
- Secrets managed via environment variables (gitignored)

### Code Execution Security

- Task runner runs in separate container
- Python/JS module restrictions via allow lists
- Sandboxed execution environment
- No direct filesystem access from code nodes

### Authentication Layers

1. **n8n Basic Auth**: Username/password for UI access
2. **Task Runner Auth**: Token-based auth between n8n ↔ runner
3. **Traefik**: Can add additional auth layers if needed
4. **Webhook Secrets**: Optional webhook signature verification

### Secrets Management

Sensitive values in `.env` (gitignored):

- Database passwords
- API keys (GitHub, Facebook, Opik)
- Auth tokens
- Encryption keys

**Never commit**:

- `.env`
- `.env.production`
- `docker-compose.override.yml`

## Scalability Considerations

### Current Setup (Single Instance)

- All executions on one n8n container
- Queue mode enabled but no workers
- Suitable for moderate workloads

### Horizontal Scaling (Future)

Enable workers by uncommenting in `docker-compose.yml`:

```yaml
n8n-worker:
  image: n8nio/n8n:latest
  command: n8n worker
  # ... same environment as main n8n
  deploy:
    replicas: 3 # Scale workers independently
```

**Benefits**:

- Multiple workers process queue concurrently
- Main n8n handles webhooks/UI only
- Better resource utilization

## Observability Integration

### Optional: Opik LLM Tracing

**When Enabled**:

- Every workflow execution traced
- LLM calls monitored
- Performance metrics collected
- Sent to Comet Opik platform

**Architecture**:

```
n8n (with n8n-observability hooks)
  ↓ OTLP/HTTP
Opik Cloud (comet.com)
  ↓
Dashboard, analytics, alerts
```

**Configuration**:

```bash
EXTERNAL_HOOK_FILES=/usr/local/lib/node_modules/n8n-observability/dist/hooks.cjs
OTEL_EXPORTER_OTLP_ENDPOINT=https://www.comet.com/opik/api/v1/private/otel
OTEL_EXPORTER_OTLP_HEADERS=Authorization=${OPIK_API_KEY},...
```

## Technology Stack

| Component      | Technology  | Version   | Purpose             |
| -------------- | ----------- | --------- | ------------------- |
| Orchestration  | n8n         | latest    | Workflow automation |
| Task Execution | n8n runners | latest    | Python/JS sandbox   |
| Database       | PostgreSQL  | 16-alpine | Data persistence    |
| Queue          | Redis       | 7-alpine  | Job queue           |
| Reverse Proxy  | Traefik     | latest    | HTTPS, routing      |
| Service Proxy  | nginx       | alpine    | ngrok routing       |
| Observability  | Opik        | -         | LLM monitoring      |

## Key Design Decisions

### Why External Task Runners?

- **Security**: Code execution isolated from main app
- **Stability**: Crashes don't affect n8n
- **Resource limits**: Can restrict CPU/memory per runner
- **Requirement**: n8n v2.0+ requires this for Python

### Why Queue Mode?

- **Scalability**: Can add workers later
- **Resilience**: Jobs survive n8n restarts
- **Visibility**: Execution status tracked in queue
- **Control**: Better execution ordering and priority

### Why Traefik?

- **Automatic HTTPS**: Let's Encrypt integration
- **Docker-native**: Service discovery via labels
- **Lightweight**: Minimal resource footprint
- **Flexible**: Easy to add more routes/services

### Why Proxy Pattern for Development?

- **Consistency**: Workflows don't change between dev/prod
- **Flexibility**: Easy to switch targets
- **Speed**: Develop locally, test against production n8n
- **Reusable**: Pattern works for any service

## Further Reading

- [Setup Guide](./SETUP.md) - Installation instructions
- [Development Workflow](./DEVELOPMENT.md) - Using the proxy pattern
- [n8n Architecture](https://docs.n8n.io/hosting/architecture/)
- [n8n Task Runners](https://docs.n8n.io/hosting/configuration/task-runners/)
