# AI Tarot Friend

> Empathetic tarot companion with memory and proactive care

AI Tarot Friend is a full-stack application that provides personalized tarot readings through an empathetic AI companion. The system remembers past conversations, provides contextual interpretations, and proactively reaches out to users with care and guidance.

## 🌟 Features

- **Conversational Tarot Readings**: Natural language interaction in Chinese and English
- **Memory & Context**: Semantic search retrieves relevant past readings
- **Crisis Detection**: Mental health pattern recognition with resource referrals
- **Proactive Outreach**: Weekly summaries and check-ins via email/LINE
- **Multi-Platform**: Web (PWA), iOS, and Android native apps
- **Free & Premium Tiers**: Daily quotas for free users, unlimited access for premium

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Clients: Next.js Web (PWA) + React Native Mobile      │
├─────────────────────────────────────────────────────────┤
│  API Gateway: Express.js + Rate Limiting + Auth        │
├─────────────────────────────────────────────────────────┤
│  Services: Tarot Engine │ Memory │ Crisis Detection    │
├─────────────────────────────────────────────────────────┤
│  AI: Model Router (gpt-4o-mini / Claude Haiku)         │
├─────────────────────────────────────────────────────────┤
│  Data: PostgreSQL + pgvector │ Redis Cache             │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

See [quickstart.md](specs/001-tarot-reading/quickstart.md) for detailed setup instructions.

### Prerequisites

- Node.js 20.x or later
- PostgreSQL 16 or later
- Redis 7.x
- Docker (optional, for containerized setup)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/TarotReading.git
cd TarotReading

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Start services (Docker)
docker-compose up -d

# Run migrations and seed data
npm run migration:run
npm run seed

# Start development servers
npm run dev
```

### Verify Setup

```bash
# Check backend health
curl http://localhost:3000/health

# Expected: {"status":"ok","database":"connected","redis":"connected"}
```

## 📁 Project Structure

```
TarotReading/
├── backend/          # Node.js + TypeScript API
├── frontend/         # Next.js 14 web app
├── mobile/           # React Native + Expo
├── shared/           # Shared types and constants
├── specs/            # Feature specifications and design docs
├── infra/            # Infrastructure as Code (Docker, Terraform)
└── docs/             # Architecture and development guides
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode (TDD)
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📖 Documentation

- **[Constitution](.specify/memory/constitution.md)**: Core principles and SLO targets
- **[Specification](specs/001-tarot-reading/spec.md)**: User requirements and acceptance criteria
- **[Implementation Plan](specs/001-tarot-reading/plan.md)**: Technical architecture and TDD workflow
- **[Tasks](specs/001-tarot-reading/tasks.md)**: Implementation roadmap
- **[Quickstart](specs/001-tarot-reading/quickstart.md)**: Developer setup guide

## 🛡️ Security & Privacy

- **Data Minimization**: Only email/LINE ID + encrypted conversations
- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **GDPR Compliance**: Export and deletion rights
- **Audit Trails**: All sensitive operations logged

## 📊 Observability

- **SLO Targets**: P95 API < 800ms, 99.9% uptime, <0.1% error rate
- **Distributed Tracing**: OpenTelemetry → Jaeger
- **Metrics**: Prometheus → Grafana dashboards
- **Logging**: Pino → Loki (PII-redacted)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow and coding standards.

## 📝 License

UNLICENSED - Proprietary software

## 🌐 Support

- Documentation: `docs/` directory
- Issues: GitHub Issues
- Contact: support@aitarotfriend.com

---

**Built with ❤️ following Spec-Driven Development (TDD) principles**
