# Deployment Guide

TomaDoctor deploys as two services:

- Backend API on Render.
- Frontend web app on Vercel.

## 1. Prepare the Repository

Push the `TomaDoctor` project to GitHub.

Do not commit local-only folders or secrets:

- `frontend/node_modules/`
- `frontend/.next/`
- `backend/venv/`
- `backend/data/`
- `backend/.env`
- `frontend/.env.local`

The trained model files in `backend/models/` are required by the deployed API.

## 2. Deploy the Backend on Render

In Render, create a new Blueprint from this repository and select `render.yaml`.

The backend service uses:

- Root directory: `backend`
- Build command: `pip install --upgrade pip && pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Set these Render environment variables:

```text
APP_ENV=production
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-jwt-key
SUPABASE_BUCKET_NAME=scan-images
```

After deployment, confirm the API is live:

```text
https://your-render-service.onrender.com/health
```

## 3. Deploy the Frontend on Vercel

In Vercel, import the same GitHub repository.

Set the Vercel project root directory to:

```text
frontend
```

Vercel will build the Next.js app using `frontend/vercel.json`.

Set these Vercel environment variables:

```text
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Redeploy the frontend after adding environment variables.

## 4. Connect Both Services

After Vercel gives you the final frontend URL, update the Render backend:

```text
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app
```

Use comma-separated origins if you want to allow production and preview domains:

```text
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

Then redeploy or restart the Render service.

## 5. Supabase Checklist

Run `backend/supabase/schema.sql` in the Supabase SQL Editor.

Create a public Storage bucket:

```text
scan-images
```

Keep the service role key on Render only. Use only the publishable key on Vercel.

## Notes

Render free services can sleep when idle, so the first API request may be slow.

The backend currently loads PyTorch models at startup. If Render build or startup memory becomes a problem, upgrade the Render instance type or move model storage to an external artifact store.
