/**
 * TarotFriend — Service-to-Service Authentication
 *
 * Handles inter-service authentication using shared secrets.
 * Each service gets a unique token for authenticating requests to other services.
 *
 * In production, this would use mTLS or a service mesh (Istio/Linkerd).
 * This implementation is a simple HMAC-based token for development.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

// ─── Types ─────────────────────────────────────────────

export interface ServiceAuthConfig {
  /** Shared secret for signing service tokens */
  secret: string;
  /** This service's identifier */
  serviceId: string;
  /** Token TTL in seconds (default: 300 = 5 minutes) */
  ttlSeconds?: number;
}

export interface ServiceToken {
  service: string;
  timestamp: number;
  signature: string;
}

// ─── ServiceAuth ───────────────────────────────────────

export class ServiceAuth {
  private secret: string;
  private serviceId: string;
  private ttlSeconds: number;

  constructor(config: ServiceAuthConfig) {
    this.secret = config.secret;
    this.serviceId = config.serviceId;
    this.ttlSeconds = config.ttlSeconds ?? 300;
  }

  /**
   * Generate a service token for outgoing requests.
   * Add as `X-Service-Auth` header.
   */
  generateToken(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${this.serviceId}:${timestamp}`;
    const signature = this.sign(payload);

    const token: ServiceToken = {
      service: this.serviceId,
      timestamp,
      signature,
    };

    return Buffer.from(JSON.stringify(token)).toString('base64');
  }

  /**
   * Verify an incoming service token from `X-Service-Auth` header.
   * Returns the calling service's ID if valid, null if invalid.
   */
  verifyToken(tokenStr: string): string | null {
    try {
      const decoded = Buffer.from(tokenStr, 'base64').toString('utf-8');
      const token: ServiceToken = JSON.parse(decoded);

      // Check TTL
      const now = Math.floor(Date.now() / 1000);
      if (now - token.timestamp > this.ttlSeconds) {
        return null; // Token expired
      }

      // Verify signature
      const payload = `${token.service}:${token.timestamp}`;
      const expectedSignature = this.sign(payload);

      const sigBuffer = Buffer.from(token.signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedBuffer.length) {
        return null;
      }

      if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
        return null;
      }

      return token.service;
    } catch {
      return null;
    }
  }

  /**
   * Express middleware to authenticate service-to-service requests.
   */
  middleware() {
    return (req: { headers: Record<string, string | string[] | undefined> },
            res: { status: (code: number) => { json: (body: unknown) => void } },
            next: () => void) => {
      const tokenHeader = req.headers['x-service-auth'];
      const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: { code: 'MISSING_SERVICE_AUTH', message: 'X-Service-Auth header required' },
        });
      }

      const serviceId = this.verifyToken(token);
      if (!serviceId) {
        return res.status(403).json({
          success: false,
          error: { code: 'INVALID_SERVICE_AUTH', message: 'Invalid or expired service token' },
        });
      }

      // Attach calling service info to request
      (req as Record<string, unknown>).callingService = serviceId;
      next();
    };
  }

  // ─── Private ─────────────────────────────────────

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }
}
