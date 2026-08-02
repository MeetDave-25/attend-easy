# AttendEasy Backend - Deployment Guide

Quick reference for deploying the API to Render and the frontend to Vercel or Netlify.

## Backend on Render

1. Push the `class-companion` project to GitHub.
2. In Render, create a new Blueprint from the repository. Use the root `render.yaml` if the repo root is `class-companion`. Use `server/render.yaml` only if you deploy the `server` folder as its own repo.
3. After the web service and PostgreSQL database are created, open the API service shell and run:

```bash
npm run db:setup
```

This creates the schema and seed accounts.

## Required Backend Environment

```env
NODE_ENV=production
DATABASE_URL=<render-postgres-connection-string>
JWT_SECRET=<secure-random-string>
JWT_EXPIRY=24h
ALLOWED_ORIGINS=https://<your-vercel-project>.vercel.app
```

## Frontend on Vercel or Netlify

Build command:

```bash
npm run build
```

Publish directory:

```bash
dist
```

Set this frontend environment variable:

```env
VITE_API_URL=https://<your-render-service>.onrender.com/api
```

After your frontend URL is live, update the backend `ALLOWED_ORIGINS` value to that exact URL.

## Default Accounts

All seeded accounts use password `password123`.

- HOD: `admin@attend.com`
- Faculty: `faculty@attend.com`
- Student: `student@attend.com`

## Test Deployment

```bash
curl https://your-render-api.onrender.com/health
```

A healthy response should show `status: healthy` and `database: connected`.
