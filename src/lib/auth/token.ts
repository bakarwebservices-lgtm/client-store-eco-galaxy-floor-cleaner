import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'super-secret-jwt-key-minimum-32-characters-long!';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

export const ADMIN_COOKIE_NAME = 'admin_session';

export interface AdminTokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

export type AdminJwtPayload = AdminTokenPayload;

export interface OrderAccessTokenPayload {
  orderId: string;
  orderNumber: string;
}

export async function signAdminToken(payload: AdminTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as AdminTokenPayload;
  } catch (error) {
    return null;
  }
}

export async function signOrderAccessToken(orderId: string, orderNumber: string): Promise<string> {
  return new SignJWT({ orderId, orderNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifyOrderAccessToken(token: string): Promise<OrderAccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as OrderAccessTokenPayload;
  } catch (error) {
    return null;
  }
}
