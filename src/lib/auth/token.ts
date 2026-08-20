import { SignJWT, jwtVerify } from 'jose';

// Separate Admin and Customer JWT secrets (BUILD_STANDARDS 2.2)
const ADMIN_JWT_SECRET_STRING =
  process.env.ADMIN_JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('ADMIN_JWT_SECRET environment variable is missing in production!');
      })()
    : 'dev-admin-jwt-secret-key-min-32-chars!!');

const CUSTOMER_JWT_SECRET_STRING =
  process.env.CUSTOMER_JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('CUSTOMER_JWT_SECRET environment variable is missing in production!');
      })()
    : 'dev-customer-jwt-secret-key-min-32-chars!!');

const ADMIN_SECRET_KEY = new TextEncoder().encode(ADMIN_JWT_SECRET_STRING);
const CUSTOMER_SECRET_KEY = new TextEncoder().encode(CUSTOMER_JWT_SECRET_STRING);

export const ADMIN_COOKIE_NAME = 'admin_session';
export const CUSTOMER_COOKIE_NAME = 'customer_session';

export interface AdminTokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

export type AdminJwtPayload = AdminTokenPayload;

export interface CustomerTokenPayload {
  customerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface OrderAccessTokenPayload {
  orderId: string;
  orderNumber: string;
}

export interface EmailVerificationTokenPayload {
  customerId: string;
  email: string;
}

export async function signAdminToken(payload: AdminTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(ADMIN_SECRET_KEY);
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ADMIN_SECRET_KEY);
    return payload as unknown as AdminTokenPayload;
  } catch (error) {
    return null;
  }
}

export async function signCustomerToken(payload: CustomerTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(CUSTOMER_SECRET_KEY);
}

export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, CUSTOMER_SECRET_KEY);
    return payload as unknown as CustomerTokenPayload;
  } catch (error) {
    return null;
  }
}

export async function signEmailVerificationToken(payload: EmailVerificationTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(CUSTOMER_SECRET_KEY);
}

export async function verifyEmailVerificationToken(token: string): Promise<EmailVerificationTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, CUSTOMER_SECRET_KEY);
    return payload as unknown as EmailVerificationTokenPayload;
  } catch (error) {
    return null;
  }
}

export async function signOrderAccessToken(orderId: string, orderNumber: string): Promise<string> {
  return new SignJWT({ orderId, orderNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(CUSTOMER_SECRET_KEY);
}

export async function verifyOrderAccessToken(token: string): Promise<OrderAccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, CUSTOMER_SECRET_KEY);
    return payload as unknown as OrderAccessTokenPayload;
  } catch (error) {
    return null;
  }
}
