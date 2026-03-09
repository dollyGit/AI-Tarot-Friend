# Quickstart Guide: AI Tarot Friend

**Feature**: 001-tarot-reading
**Date**: 2025-10-08
**Audience**: Developers setting up local environment

## Prerequisites

- **Node.js**: 20.x or later ([download](https://nodejs.org/))
- **PostgreSQL**: 16 or later ([download](https://www.postgresql.org/download/))
- **Redis**: 7.x ([download](https://redis.io/download/))
- **Docker** (optional, for containerized setup): [download](https://www.docker.com/products/docker-desktop/)
- **Git**: For version control

## Quick Setup (Docker Compose - Recommended)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/TarotReading.git
cd TarotReading
git checkout 001-tarot-reading
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/tarot_dev

# Redis
REDIS_URL=redis://localhost:6379

# AI Providers (obtain from OpenAI/Anthropic)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Secrets
JWT_SECRET=your-secret-key-change-in-production

# External Services
SENDGRID_API_KEY=SG...
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...

# Payments (test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Observability (optional for local)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### 3. Start Services

```bash
# Start PostgreSQL, Redis, and application
docker-compose up -d

# Check service health
docker-compose ps
```

### 4. Run Database Migrations

```bash
npm run migration:run

# Seed reference data (78 cards, spreads)
npm run seed
```

### 5. Verify Setup

```bash
# Backend health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","database":"connected","redis":"connected"}
```

## Manual Setup (Without Docker)

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

### 2. Start PostgreSQL & Redis

```bash
# macOS (Homebrew)
brew services start postgresql@16
brew services start redis

# Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl start redis

# Windows: Use installers or WSL2
```

### 3. Create Database

```bash
createdb tarot_dev

# Enable pgvector extension
psql tarot_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 4. Run Migrations & Seed Data

```bash
npm run migration:run
npm run seed
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend API
cd backend
npm run dev
# Runs on http://localhost:3000

# Terminal 2: Frontend Web
cd frontend
npm run dev
# Runs on http://localhost:3001

# Terminal 3: Mobile (Expo)
cd mobile
npm start
# Follow Expo CLI instructions for iOS/Android simulator
```

## Development Workflow

### Running Tests

```bash
# All tests (unit + integration + contract)
npm test

# Watch mode (TDD)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test suite
npm test -- readings.test.ts
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Formatting
npm run format
```

### Database Operations

```bash
# Generate new migration
npm run migration:generate -- AddFieldToUsers

# Revert last migration
npm run migration:revert

# Reset database (⚠️ destroys data)
npm run db:reset
```

### Debugging

**Backend (Node.js)**:

```bash
# Start with debugger
npm run dev:debug

# Attach VS Code debugger (launch.json included)
# Press F5 in VS Code
```

**Frontend (Next.js)**:

```bash
# Enable React DevTools
# Install browser extension, then:
npm run dev

# Browser will show Components/Profiler tabs
```

## API Testing

### Using curl

```bash
# Create user session
curl -X POST http://localhost:3000/v1/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel": "web"}'

# Create reading
curl -X POST http://localhost:3000/v1/readings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spread_type": "3-card",
    "context": "I am worried about my career path"
  }'
```

### Using REST Client (VS Code Extension)

Install "REST Client" extension, then use `tests/api.http`:

```http
### Create Session
POST http://localhost:3000/v1/sessions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "channel": "web"
}

### Draw Cards
POST http://localhost:3000/v1/readings
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "spread_type": "3-card",
  "context": "Career guidance needed"
}
```

## Common Issues & Troubleshooting

### Issue: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**: PostgreSQL not running

```bash
# macOS
brew services start postgresql@16

# Check status
brew services list
```

### Issue: `TypeError: Cannot read property 'embedding' of undefined`

**Solution**: pgvector extension not enabled

```bash
psql tarot_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Issue: `OpenAI API rate limit exceeded`

**Solution**: Check API key quota or use mock LLM in development

```bash
# In .env, set mock mode
USE_MOCK_LLM=true
```

### Issue: Tests failing with `Error: jwt malformed`

**Solution**: Generate valid JWT for tests

```bash
npm run generate-test-token
# Copy token to tests/fixtures/auth.json
```

## Next Steps

1. **Read Architecture Docs**: `docs/architecture.md`
2. **Review TDD Guide**: `docs/tdd-guide.md` for Red-Green-Refactor examples
3. **Explore API Contracts**: `specs/001-tarot-reading/contracts/openapi.yaml`
4. **Generate Tasks**: Run `/speckit.tasks` to create implementation checklist
5. **Start Implementing**: Follow TDD workflow for each task

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm test` | Run all tests |
| `npm run migration:run` | Apply database migrations |
| `npm run seed` | Seed reference data (cards, spreads) |
| `npm run lint` | Check code style |
| `npm run type-check` | TypeScript type validation |
| `docker-compose up` | Start containerized environment |
| `docker-compose down` | Stop all containers |
| `npm run generate-contracts` | Generate TypeScript types from OpenAPI |

## Support

- **Documentation**: `docs/` directory
- **Slack**: #tarot-reading-dev (internal)
- **Issues**: GitHub Issues for bugs/feature requests

---

**Happy Coding! Remember: Red → Green → Refactor** 🔴 ✅ ♻️
