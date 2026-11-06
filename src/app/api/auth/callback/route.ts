import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Validate redirect URL to prevent open redirect vulnerabilities
      const isRelative = next.startsWith('/') && !next.startsWith('//');
      const targetUrl = isRelative ? new URL(next, origin) : new URL('/dashboard', origin);
      return NextResponse.redirect(targetUrl);
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=Could not authenticate session. Please try again.', origin)
  );
}
