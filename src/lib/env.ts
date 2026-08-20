import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Node Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Authentication Secrets
  ADMIN_JWT_SECRET: z.string().min(16, 'ADMIN_JWT_SECRET must be at least 16 characters'),
  CUSTOMER_JWT_SECRET: z.string().min(16, 'CUSTOMER_JWT_SECRET must be at least 16 characters'),

  // Base URL
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Optional Payment Gateway Keys (populated per client deployment)
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_ENVIRONMENT: z.enum(['sandbox', 'live']).default('sandbox'),

  // Optional Tracking IDs (populated per client deployment)
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().optional(),

  // Optional SMTP Email Transport
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  // During build / development without full config, parse safely or read env
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment variables in production. Terminating startup.');
    }
  }

  return (parsed.success ? parsed.data : process.env) as Env;
}

export const env = validateEnv();
export default env;
