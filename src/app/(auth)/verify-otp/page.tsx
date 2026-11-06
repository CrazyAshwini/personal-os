'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OtpVerificationCard } from '@/components/auth/otp-verification-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function VerifyOtpInner() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [isEditingEmail, setIsEditingEmail] = useState(!emailParam);

  if (isEditingEmail || !email) {
    return (
      <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Verify Account</CardTitle>
          <CardDescription>Enter the email address you registered with</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target-email">Email</Label>
            <Input
              id="target-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!email.includes('@')}
            onClick={() => setIsEditingEmail(false)}
          >
            Continue to Verification
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <OtpVerificationCard
      email={email}
      type="signup"
      onBack={() => setIsEditingEmail(true)}
    />
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-neutral-500">Loading verification...</div>}>
      <VerifyOtpInner />
    </Suspense>
  );
}
