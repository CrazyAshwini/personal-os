'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type VerifyOtpInput,
  type ResendOtpInput,
} from '@/lib/validation/auth';

export type AuthActionResult = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  requireOtp?: boolean;
  email?: string;
};

export async function loginAction(
  values: LoginInput
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: 'Invalid input. Please check your details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return {
        error: 'Your email is not verified yet. Please enter the verification code sent to your inbox.',
        requireOtp: true,
        email: parsed.data.email,
      };
    }
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function registerAction(
  values: RegisterInput
): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: 'Invalid input. Please check your details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled or automatic session exists, go straight to dashboard
  if (data.session) {
    redirect('/dashboard');
  }

  return {
    success: true,
    requireOtp: true,
    email: parsed.data.email,
  };
}

export async function verifyOtpAction(
  values: VerifyOtpInput
): Promise<AuthActionResult> {
  const parsed = verifyOtpSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: 'Please enter a valid 6-digit verification code.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: parsed.data.type,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect('/dashboard');
  }

  return {
    success: true,
    email: parsed.data.email,
  };
}

export async function resendOtpAction(
  values: ResendOtpInput
): Promise<AuthActionResult> {
  const parsed = resendOtpSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: 'Invalid email address.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    email: parsed.data.email,
    type: parsed.data.type,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function forgotPasswordAction(
  values: ForgotPasswordInput
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: 'Invalid email address.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
    }
  );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updatePasswordAction(
  values: ResetPasswordInput
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: 'Invalid password input.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
