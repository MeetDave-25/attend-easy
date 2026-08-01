# AttendEasy Backend Server

Backend API for the AttendEasy attendance management system.

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:setup
npm start
```

The server runs on `http://localhost:3000` by default.

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
PORT=3000
NODE_ENV=development
JWT_SECRET=change-this-secret
JWT_EXPIRY=24h
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080
```

## Seed Accounts

All seeded accounts use password `password123`.

- HOD: `admin@attend.com`
- Faculty: `faculty@attend.com`
- Student: `student@attend.com`

## API Endpoints

- `GET /health`
- `POST /api/auth/login`
- `GET /api/auth/verify`
- `GET /api/students`
- `GET /api/subjects`
- `POST /api/attendance/sessions`
- `POST /api/attendance/mark`
- `GET /api/marks`

## Deployment

See `DEPLOYMENT.md` for Render plus Vercel/Netlify deployment steps.
