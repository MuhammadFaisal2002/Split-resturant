# Database setup

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, paste `migrations/0001_init.sql`, run it.
3. **Authentication → Providers**: enable **Email** (magic link is on by default).
   Optionally enable **Google** (needs an OAuth client from Google Cloud Console).
4. **Authentication → URL Configuration**: set Site URL to your app URL and add
   `http://localhost:3000/auth/callback` (and your production URL + `/auth/callback`)
   to Redirect URLs.
5. **Project Settings → API**: copy Project URL, anon key and service_role key into `.env.local`.

Screenshots live in the private `screenshots` bucket and are served to the
organizer via short-lived signed URLs.
