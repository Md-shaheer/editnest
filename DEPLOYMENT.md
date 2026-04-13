# EditNest Deployment Checklist

## 1. Railway backend

- Service root directory: `backend`
- Required variables:
  - `SECRET_KEY`
  - `FRONTEND_URL`
  - `API_KEY`
- Optional variables:
  - `DATABASE_URL`
  - `CORS_ALLOWED_ORIGINS`
  - `CORS_ALLOW_ORIGIN_REGEX`
  - `REPLICATE_API_TOKEN`
- For the real frontend domain use:

```text
FRONTEND_URL=https://editnest.in
CORS_ALLOWED_ORIGINS=https://www.editnest.in
```

### Important database rule

- If Railway Postgres is not added yet, delete `DATABASE_URL` from Railway.
- The backend will fall back to local SQLite automatically.
- Only set `DATABASE_URL` when you have the exact Railway Postgres connection URL.

### Health check

- After deploy succeeds, verify:

```text
https://glistening-serenity-production.up.railway.app/health
```

- Expected response:

```json
{"status":"healthy"}
```

## 2. Custom domain

- Frontend custom domain belongs on Vercel, not on the Railway backend apex.
- `editnest.in` and `www.editnest.in` should point to the Vercel project.
- Current Vercel guidance for this project is:

```text
A @ 76.76.21.21
CNAME www cname.vercel-dns.com
```

- The domain is still on `ns1.afternic.com` / `ns2.afternic.com`, so update the DNS records there or switch the nameservers to Vercel.
- Keep the backend on Railway for now:

```text
https://glistening-serenity-production.up.railway.app/health
```

- If you later want a custom backend hostname, use a subdomain like `api.editnest.in`, not the apex domain.
- After DNS propagation, re-test the frontend:

```text
https://editnest.in
```

## 3. Vercel frontend

- Set:

```text
VITE_API_URL=/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=editnest-6d68e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=editnest-6d68e
VITE_FIREBASE_STORAGE_BUCKET=editnest-6d68e.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=276474642646
VITE_FIREBASE_APP_ID=1:276474642646:web:eb0e934b5048cfbb81c977
VITE_FIREBASE_MEASUREMENT_ID=G-2QRH5W5HJN
```

- Keep `vercel.json` rewriting `/api/*` to Railway. That lets `https://editnest.in` call the API without exposing the Railway hostname in the browser.
- Only change `VITE_API_URL` away from `/api` if you later move the API behind your own custom API hostname such as `https://api.editnest.in`.

- Redeploy the Vercel project after each env change or new production push.

### CLI commands

```powershell
vercel env add VITE_API_URL production --value "/api" --yes
vercel env add VITE_API_URL preview --value "/api" --yes
vercel env add VITE_API_URL development --value "/api" --yes
```
