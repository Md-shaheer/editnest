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

- Add the exact DNS records Railway generates for `editnest.com`
- Wait for DNS propagation
- Re-test:

```text
https://editnest.com/health
```

## 3. Vercel frontend

- Set:

```text
VITE_API_URL=https://glistening-serenity-production.up.railway.app
```

- Once the custom domain is confirmed live, switch it to:

```text
VITE_API_URL=https://editnest.com
```

- Redeploy the Vercel project after each env change

### CLI commands

```powershell
vercel env add VITE_API_URL production --value "https://glistening-serenity-production.up.railway.app" --yes
vercel env add VITE_API_URL preview --value "https://glistening-serenity-production.up.railway.app" --yes
vercel env add VITE_API_URL development --value "https://glistening-serenity-production.up.railway.app" --yes
```
