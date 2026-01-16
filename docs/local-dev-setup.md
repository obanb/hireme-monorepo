# Local Development Setup

This guide explains how to run PostgreSQL and RabbitMQ locally using Docker and how to connect to them for viewing/managing data.

## Quick Start

```bash
# Start PostgreSQL
docker run -d --name hireme-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15

# Start RabbitMQ
docker run -d --name hireme-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management
```

## PostgreSQL

### Docker Commands

```bash
# Start new container
docker run -d \
  --name hireme-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  postgres:15

# Start existing container
docker start hireme-postgres

# Stop container
docker stop hireme-postgres

# View logs
docker logs hireme-postgres

# Remove container (deletes data!)
docker rm -f hireme-postgres

# Connect via psql inside container
docker exec -it hireme-postgres psql -U postgres
```

### Connection Details

| Property | Value |
|----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `postgres` (dev) / `postgres_test` (tests) |
| Username | `postgres` |
| Password | `postgres` |

### Connection String

```
postgresql://postgres:postgres@localhost:5432/postgres
```

### Useful psql Commands

```bash
# Connect to dev database
docker exec -it hireme-postgres psql -U postgres -d postgres

# Connect to test database
docker exec -it hireme-postgres psql -U postgres -d postgres_test

# List databases
\l

# List tables
\dt

# Describe table
\d events
\d reservations

# View events
SELECT * FROM events ORDER BY id DESC LIMIT 10;

# View reservations
SELECT * FROM reservations;

# View event data (formatted JSON)
SELECT id, stream_id, version, type, jsonb_pretty(data) FROM events;

# Count events by type
SELECT type, COUNT(*) FROM events GROUP BY type;
```

### IDE/GUI Tools

#### 1. DBeaver (Free, Cross-platform)
- Download: https://dbeaver.io/download/
- New Connection > PostgreSQL
- Enter connection details above
- Features: SQL editor, data viewer, ER diagrams

#### 2. pgAdmin (Free, Official)
- Download: https://www.pgadmin.org/download/
- Add New Server
- Connection tab: Enter details above
- Features: Query tool, dashboard, backup/restore

#### 3. DataGrip (Paid, JetBrains)
- Download: https://www.jetbrains.com/datagrip/
- New Data Source > PostgreSQL
- Features: Smart SQL completion, version control integration

#### 4. VS Code Extensions
- **PostgreSQL** by Chris Kolkman
  - Install from Extensions marketplace
  - Cmd/Ctrl+Shift+P > "PostgreSQL: Add Connection"

- **Database Client** by Weijan Chen
  - Install from Extensions marketplace
  - Click database icon in sidebar
  - Add PostgreSQL connection

#### 5. TablePlus (Freemium, macOS/Windows/Linux)
- Download: https://tableplus.com/
- Create new connection > PostgreSQL
- Clean, native interface

### Verify Connection

```bash
# Test connection from command line
docker exec hireme-postgres psql -U postgres -c "SELECT version();"

# Check tables exist
docker exec hireme-postgres psql -U postgres -d postgres -c "\dt"
```

---

## RabbitMQ

### Docker Commands

```bash
# Start new container
docker run -d \
  --name hireme-rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:management

# Start existing container
docker start hireme-rabbitmq

# Stop container
docker stop hireme-rabbitmq

# View logs
docker logs hireme-rabbitmq

# Remove container
docker rm -f hireme-rabbitmq
```

### Connection Details

| Property | Value |
|----------|-------|
| Host | `localhost` |
| AMQP Port | `5672` |
| Management Port | `15672` |
| Username | `guest` |
| Password | `guest` |
| Virtual Host | `/` |

### AMQP Connection String

```
amqp://guest:guest@localhost:5672
```

### Management UI (Built-in)

Open in browser: **http://localhost:15672**

Login: `guest` / `guest`

#### Management UI Features:
- **Overview**: Node stats, message rates
- **Connections**: Active AMQP connections
- **Channels**: Open channels
- **Exchanges**: View `domain_events` exchange
- **Queues**: Create queues, view messages
- **Admin**: Users, permissions, policies

#### View Published Events:

1. Go to **Queues** tab
2. Click **Add a new queue**
3. Name: `debug-queue`, click **Add queue**
4. Go to **Exchanges** tab
5. Click on `domain_events`
6. Under **Bindings**, add binding:
   - To queue: `debug-queue`
   - Routing key: `event.#` (all events)
7. Go back to **Queues** > `debug-queue`
8. Click **Get Messages** to view events

### CLI Tools

```bash
# List exchanges
docker exec hireme-rabbitmq rabbitmqctl list_exchanges

# List queues
docker exec hireme-rabbitmq rabbitmqctl list_queues

# List bindings
docker exec hireme-rabbitmq rabbitmqctl list_bindings
```

### GUI Tools (Besides Management UI)

#### 1. RabbitMQ Manager (VS Code Extension)
- Install "RabbitMQ" extension
- Connect using AMQP URL

#### 2. AMQP Client (Desktop Apps)
- **RabbitMQ Assistant** (macOS): https://github.com/snooken/rabbitmq-assistant
- Features: Browse queues, publish/consume messages

---

## Docker Compose (All Services)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: hireme-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  rabbitmq:
    image: rabbitmq:management
    container_name: hireme-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  postgres_data:
  rabbitmq_data:
```

Commands:
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (deletes data!)
docker-compose down -v

# View logs
docker-compose logs -f
```

---

## Environment Variables

For development, create `.env` file in `packages/backend/`:

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Or use connection string (for Supabase)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=domain_events
```

---

## Troubleshooting

### PostgreSQL

```bash
# Check if container is running
docker ps | grep postgres

# Check port is not in use
netstat -an | grep 5432

# Reset database (delete all data)
docker exec hireme-postgres psql -U postgres -c "DROP DATABASE IF EXISTS postgres_test;"
```

### RabbitMQ

```bash
# Check if container is running
docker ps | grep rabbitmq

# Wait for RabbitMQ to be ready (takes ~10-15 seconds)
sleep 15

# Check management UI is accessible
curl -u guest:guest http://localhost:15672/api/overview

# Reset RabbitMQ (delete all queues/exchanges)
docker exec hireme-rabbitmq rabbitmqctl stop_app
docker exec hireme-rabbitmq rabbitmqctl reset
docker exec hireme-rabbitmq rabbitmqctl start_app
```

### Connection Refused Errors

1. Ensure Docker containers are running: `docker ps`
2. Wait for services to fully start (especially RabbitMQ)
3. Check firewall isn't blocking ports
4. On Windows/Mac, ensure Docker Desktop is running
