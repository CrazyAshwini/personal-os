# Security Architecture & Threat Model --- Personal OS

**Version:** 1.0  
**Classification:** Internal Developer & Security Specification  

---

## 1. Security Principles

1. **Defense in Depth:** Security is validated at the Proxy (routing layer), Server Actions (application layer), and PostgreSQL Row Level Security (data layer).
2. **Zero Trust Client Identity:** Client-supplied `user_id` fields are never trusted. Identity is extracted strictly from the authenticated JWT session via `(SELECT auth.uid())`.
3. **No Credential Exposure:** Service role keys and secrets are isolated to the server runtime (`import 'server-only'`).

---

## 2. Threat Analysis & Mitigations

| Threat | Risk Level | Mitigation Strategy |
|---|---|---|
| **Cross-Tenant Data Leakage** | Critical | RLS policies on 100% of tables enforce `USING (user_id = (SELECT auth.uid()))`. Automated tests (`account-isolation.test.ts`) verify that User A cannot read or write User B's records. |
| **Service Role Secret Leak** | Critical | `src/lib/supabase/admin.ts` enforces `import 'server-only'`. Secret keys are prefixed without `NEXT_PUBLIC_` and excluded from client bundles. |
| **Open Redirect via Callbacks** | High | `/api/auth/callback` verifies that target paths start with `/` and do not start with `//` to prevent redirection to external domains. |
| **Storage Object Tampering** | High | Storage buckets are marked `public = false`. RLS on `storage.objects` validates that the top-level folder matches `auth.uid()::text`. |
| **Brute Force & Weak Passwords** | Medium | Zod schema enforces minimum 8 characters, at least one uppercase letter, and at least one number. |
| **Session Hijacking** | Medium | HTTP-only, secure, SameSite cookies managed by `@supabase/ssr` with proxy token refresh on incoming requests. |

---

## 3. Storage Security Rules

```sql
-- Enforce user folder boundary
CREATE POLICY "Users can upload own documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user_documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
```

- Allowed mime types: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`, `text/plain`.
- Maximum file size: 10MB per document, 2MB per avatar.
