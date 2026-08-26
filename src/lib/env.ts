import { z } from 'zod';

const emptyToUndefined = (val: unknown) => (typeof val === 'string' && val.trim() === '' ? undefined : val);

const envSchema = z.object({
  // Database
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().min(1, 'DATABASE_URL is required').default('postgresql://user:password@localhost:5432/ecommerce_db?schema=public')),

  // Node Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Authentication Secrets
  ADMIN_JWT_SECRET: z.preprocess(emptyToUndefined, z.string().min(16, 'ADMIN_JWT_SECRET must be at least 16 characters').default('dev-admin-jwt-secret-key-min-32-chars!!')),
  CUSTOMER_JWT_SECRET: z.preprocess(emptyToUndefined, z.string().min(16, 'CUSTOMER_JWT_SECRET must be at least 16 characters').default('dev-customer-jwt-secret-key-min-32-chars!!')),

  // Credential Encryption Secret (32 bytes = 64 hex characters for AES-256-GCM)
  ENCRYPTION_MASTER_KEY: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)').default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
  ),

  // Base URL
  NEXT_PUBLIC_APP_URL: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? val : 'http://localhost:3000'),
    z.string().url()
  ),

  // Optional Payment Gateway Keys (populated per client deployment)
  PAYPAL_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_ENVIRONMENT: z.preprocess(
    (val) => (val === 'live' || val === 'sandbox' ? val : 'sandbox'),
    z.enum(['sandbox', 'live']).default('sandbox')
  ),

  // Optional Tracking IDs (populated per client deployment)
  NEXT_PUBLIC_META_PIXEL_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),

  // Optional SMTP Email Transport
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().optional()),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_FROM: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  // During build / development without full config, parse safely or read env
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
      throw new Error('Invalid environment variables in production. Terminating startup.');
    }
  }

  return (parsed.success ? parsed.data : process.env) as Env;
}

export const env = validateEnv();
export default env;
