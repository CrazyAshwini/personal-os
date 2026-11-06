'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyOtpAction, resendOtpAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, MailCheck, RotateCcw } from 'lucide-react';

interface OtpVerificationCardProps {
  email: string;
  type?: 'signup' | 'email';
  onBack?: () => void;
  onSuccess?: () => void;
}

export function OtpVerificationCard({
  email,
  type = 'signup',
  onBack,
  onSuccess,
}: OtpVerificationCardProps) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanToken = token.trim();
    if (cleanToken.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyOtpAction({
        email,
        token: cleanToken,
        type,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard');
        }
      }
    } catch {
      // In Next.js, redirect() inside server action can trigger navigation catch
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    setError(null);
    setIsResending(true);
    try {
      const result = await resendOtpAction({
        email,
        type: 'signup',
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccessMessage('A fresh verification code has been sent to your email.');
        setCountdown(60);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          <MailCheck className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">Verify your email</CardTitle>
        <CardDescription className="text-sm">
          We sent a 6-digit verification code to
          <br />
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{email}</span>
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleVerify}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="otp" className="text-center block text-xs uppercase tracking-wider text-neutral-500">
              Enter 6-Digit OTP Code
            </Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              autoComplete="one-time-code"
              placeholder="123456"
              value={token}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setToken(val);
                if (error) setError(null);
              }}
              disabled={isVerifying}
              className="text-center text-2xl font-mono tracking-[0.5em] h-12"
            />
            <p className="text-center text-xs text-neutral-500">
              Check your inbox and spam folder for the confirmation code.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isVerifying || token.trim().length !== 6}
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify & Continue
          </Button>

          <div className="flex items-center justify-between w-full pt-1 text-xs">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={isVerifying}
                className="text-neutral-500 hover:text-neutral-900 underline dark:hover:text-neutral-200"
              >
                Change email
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || isResending || isVerifying}
              className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
            >
              <RotateCcw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
              {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
            </button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
