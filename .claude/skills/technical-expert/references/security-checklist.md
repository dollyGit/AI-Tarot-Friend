# Security Checklist

## JWT Service Token Structure

### Access Token Payload
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "type": "access",
  "iss": "tarot-reading-backend",
  "iat": 1700000000,
  "exp": 1700604800
}
```

### Service-to-Service Token
```json
{
  "sub": "service-customer-mgmt",
  "type": "service",
  "iss": "service-customer-mgmt",
  "permissions": ["read:customer", "write:customer"],
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Validation Middleware
```typescript
// From /TarotReading/backend/src/api/middleware/auth.ts
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== 'access') return res.status(401).json({ error: 'Invalid token type' });

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user || user.status !== 'active') return res.status(401).json({ error: 'User inactive' });

  req.user = user;
  next();
}
```

---

## GDPR Consent Model

### customer_consent table
```sql
CREATE TABLE customer_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer(id),
  consent_type VARCHAR(50) NOT NULL,  -- 'data_processing', 'marketing_email', 'marketing_line', 'analytics'
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Consent Check Before Data Operations
```typescript
async function checkConsent(customerId: string, consentType: string): Promise<boolean> {
  const consent = await dal.query('customer', 'consent', {
    filters: { customer_id: customerId, consent_type: consentType }
  });
  return consent?.granted === true && consent?.revoked_at === null;
}

// Always check before:
// - Sending marketing messages (marketing_email, marketing_line)
// - Processing behavioral data (analytics)
// - Generating behavior profiles (data_processing)
```

---

## PII Redaction in Logs

### Pino Logger Configuration
```typescript
const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.email',
      'req.body.token',
      'req.body.line_id',
      'res.body.access_token',
      'res.body.refresh_token',
      '*.email',
      '*.password',
      '*.line_id',
      '*.phone',
    ],
    remove: true,  // Completely remove field (vs replacing with [REDACTED])
  },
});
```

### Fields That Must NEVER Appear in Logs
- Email addresses
- Passwords / tokens / secrets
- LINE user IDs
- Phone numbers
- Birth dates (PII under GDPR)
- Financial account numbers
- IP addresses (log only when required for security)

---

## Rate Limiting Configuration

### Redis-Backed Rate Limiter
```typescript
// From /TarotReading/backend/src/api/middleware/rate-limiter.ts
const rateLimits = {
  api: { window: 60, max: 100 },        // 100 requests per minute (general)
  auth: { window: 900, max: 10 },        // 10 auth attempts per 15 minutes
  readings: { window: 60, max: 20 },     // 20 readings per minute
  webhooks: { window: 60, max: 200 },    // 200 webhook events per minute (Shopify)
};
```

### Redis Key Pattern
```
ratelimit:{customer_id}:{action}:{window_start}
```

---

## API Gateway Security Rules

| Rule | Configuration |
|------|--------------|
| Block `/internal/*` | Only allow from internal network CIDR |
| HTTPS enforcement | Redirect all HTTP to HTTPS |
| CORS | Allow only approved frontend origins |
| Request size limit | 10MB max body (for file uploads) |
| Header validation | Require `Content-Type: application/json` for POST/PUT |
| IP blocklist | Auto-block after 1000 4xx errors per hour |
| Rate limiting (global) | 1000 req/min per IP at gateway level |

---

## Audit Log Pattern

### AuditLog Model (from Prisma schema)
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  action      String   // "customer.created", "reading.completed", "consent.revoked"
  entity      String   // "customer", "reading", "subscription"
  entityId    String
  changes     Json?    // { before: {...}, after: {...} }
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
}
```

### When to Log
- Customer profile creation/update/deletion
- Consent granted/revoked
- Subscription changes
- Financial transactions
- Admin actions on customer data
- Failed authentication attempts
- Rate limit violations

---

## Environment Variable Management

### Required Variables (never hardcode)
```env
# Database
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
INFLUXDB_URL=http://...
INFLUXDB_TOKEN=...
QDRANT_URL=http://...
NEO4J_URI=bolt://...
NEO4J_PASSWORD=...

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# AI
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# Shopify
SHOPIFY_ADMIN_TOKEN=...
SHOPIFY_WEBHOOK_SECRET=...
SHOPIFY_STOREFRONT_TOKEN=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Messaging
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
```

### Rules
1. Never commit `.env` files (`.gitignore` must include `*.env*`)
2. Use Docker secrets or Kubernetes secrets in production
3. Rotate API keys quarterly
4. Use separate keys for dev/staging/production
5. Monitor for leaked credentials (GitHub secret scanning)
