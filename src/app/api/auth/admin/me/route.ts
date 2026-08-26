import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user: session,
  });
}
