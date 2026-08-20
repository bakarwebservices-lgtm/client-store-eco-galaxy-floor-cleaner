'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const isSuccess = status === 'success';
  const isInvalid = status === 'invalid_or_expired';

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card border border-border shadow-sm">
        {isSuccess ? (
          <CheckCircle2 className="h-8 w-8 text-success" />
        ) : (
          <AlertTriangle className="h-8 w-8 text-warning" />
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isSuccess ? 'Email Verified Successfully!' : 'Email Verification Issue'}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isSuccess
            ? 'Your email is confirmed. Your past guest orders and saved addresses are now fully unlocked in your account.'
            : isInvalid
            ? 'The verification link has expired or is invalid. Please log in and request a new verification link.'
            : 'Unable to verify email at this moment. Please try again.'}
        </p>
      </div>

      <Link
        href="/account"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
      >
        <span>Go to Dashboard</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-muted-foreground">Processing verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
