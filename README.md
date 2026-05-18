# NBG DocSign

Secure document signing platform for NetBounce Global LLC.

## Document Categories

- Sales & Legal Document
- Accounts Document
- HR Document

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   CRM_API_TOKEN=replace-with-a-strong-token
   ```

3. Run the database setup in Supabase SQL Editor:
   - Fresh database: `supabase/schema.sql`
   - Existing database: `supabase/update-doc-types.sql`

4. Create a login user in Supabase:
   - Supabase Dashboard
   - Authentication
   - Users
   - Add user
   - Use that email/password on `/login`

5. Start locally:
   ```bash
   npm run dev
   ```

Open `http://localhost:3000/login`.

## Production URL Rules

Set `NEXT_PUBLIC_APP_URL` in Vercel to the real production domain candidates should open, such as a custom domain or the active Vercel project domain. Do not use Vercel dashboard URLs, deleted preview deployments, placeholder domains, or localhost in production.

Candidate document links use document IDs:

- `/api/document/<documentId>` opens view-only PDFs such as Review Agreement and Pre-Invoice.
- `/view-document/<documentId>` opens the signing flow for agreements.
- Old `/api/track/view/<documentId>` links are still supported and redirect to the document view route.

`CRM_API_TOKEN` is only used by `/api/documents-by-email` for CRM/API access. It does not generate PDFs, but the CRM integration should send it as the `x-api-token` header when configured.

## Optional Gmail Sending

If Gmail credentials are not configured, the app still works. Signing links are generated and can be copied manually from the document dashboard.

```env
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_SENDER_EMAIL=myteam@netbounceglobal.com
```
