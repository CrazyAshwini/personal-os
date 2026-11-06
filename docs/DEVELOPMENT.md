# Local Development Guide --- Personal OS

**Prerequisites:**
- Node.js LTS (v20+ or v25+)
- npm (v10+)
- Git
- Supabase CLI (`npx supabase`)

---

## 1. Getting Started

### 1.1 Clone & Setup Environment

```bash
cd E:\personal-os
cp .env.example .env.local
```

Populate `.env.local` with your development Supabase credentials:
```env
NEXT_PUBLIC_APP_NAME="Personal OS"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
SUPABASE_SECRET_KEY=<your-service-role-key>
```

### 1.2 Start Local Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Testing & Quality Checks

Run all verification tools before staging changes:

```bash
# Run unit & integration test suites
npm run test

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint
npm run lint

# Run optimized Turbopack production build
npm run build
```

---

## 3. Database Migrations

All schema changes must be version-controlled SQL files in `supabase/migrations/`:

```text
supabase/migrations/YYYYMMDDHHMMSS_<description>.sql
```

To create a new migration or apply migrations to local Supabase:
```bash
npx supabase migration new <description>
npx supabase db push
```

---

## 4. Coding Standards

- **TypeScript:** Strict mode enabled. Never use `any`. Define strong types in `src/types/`.
- **Styling:** Use Tailwind CSS utility classes and design tokens defined in `src/app/globals.css`.
- **Validation:** Always validate untrusted inputs with Zod schemas in `src/lib/validation/`.
- **Components:** Default to Server Components. Use Client Components only when browser APIs or interactivity is required.
