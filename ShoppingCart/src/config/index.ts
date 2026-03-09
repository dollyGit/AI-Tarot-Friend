/**
 * Service Configuration — env validation via Zod
 */
import { z } from 'zod';

const envSchema = z.object({
  // Service
  SERVICE_NAME: z.string().default('shop'),
  PORT: z.coerce.number().default(3030),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/shop_db'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Kafka
  KAFKA_BROKERS: z.string().default('localhost:9092'),

  // Auth
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRY: z.string().default('7d'),

  // Service Auth
  SERVICE_AUTH_SECRET: z.string().default('dev-service-secret'),

  // CORS
  FRONTEND_URL: z.string().default('http://localhost:3001'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof envSchema>;
