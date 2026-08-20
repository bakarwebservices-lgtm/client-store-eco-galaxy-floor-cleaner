import { SignJWT, jwtVerify } from 'jose';
import { AdminRole } from '@prisma/client';
import { env } from '@/lib/env';

export const ADMIN_COOKIE_NAME = 'admin_session';

export interface AdminJwtPayload {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.ADMIN_JWT_SECRET);
}

export async function signAdminToken(payload: AdminJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (!payload.id || !payload.email || !payload.role) {
      return null;
    }
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as AdminRole,
    };
  } catch {
    return null;
  }
}
