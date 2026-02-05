# Truuth Document Submission Portal

A secure document submission portal for applicant verification, built with React, TypeScript, and Node.js.

## Features

- User authentication (register/login)
- Document upload for Philippines Passport, Driver's Licence, and Resume
- Automatic document classification via Truuth Classifier API
- Document verification via Truuth Verify API
- Real-time status polling for verification results
- Persistent storage of verification status across sessions
- Responsive, modern UI built with Tailwind CSS

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM with PostgreSQL
- JWT authentication

## Project Structure

```
truuth-portal/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── contexts/   # React contexts (Auth)
│   │   ├── lib/        # Utilities and API client
│   │   └── pages/      # Page components
│   └── ...
├── api/                # Express backend API
│   ├── src/
│   │   ├── lib/        # Utilities (Prisma, Truuth API)
│   │   ├── middleware/ # Express middleware
│   │   └── routes/     # API routes
│   └── prisma/         # Database schema
├── serverless.yml      # AWS Lambda deployment config
└── package.json        # Root package.json
```

## Local Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use a cloud provider like Supabase, Railway, Vercel Postgres)
- Truuth API credentials

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd truuth-portal

# Install all dependencies
npm run install:all
```

### 2. Configure Environment Variables

#### Backend (api/.env)

```bash
cd api
cp .env.example .env
```

Edit `api/.env` with your values:

```env
# Database connection string
DATABASE_URL="postgresql://user:password@localhost:5432/truuth_portal"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Truuth API Credentials
TRUUTH_API_KEY="igWS83bV4LMXcs0PpGdI"
TRUUTH_API_SECRET="d806c9e3d9c32078a3b4e5429ca71daed235cbd66bb9ea88f181f4e2ad6335bb"
TRUUTH_TENANT_ALIAS="truuthhiring"

# Server config
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

### 3. Setup Database

```bash
cd api

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Run Development Servers

From the root directory:

```bash
# Run both frontend and backend concurrently
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend
cd api && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Documents

- `GET /api/documents` - Get all documents for current user
- `POST /api/documents/upload` - Upload a document
- `GET /api/documents/:id/status` - Poll document verification status
- `GET /api/documents/:id/result` - Get verification result

## Deployment to Vercel

### 1. Create Vercel Project

```bash
npm i -g vercel
vercel login
```

### 2. Configure Environment Variables in Vercel

Add the following environment variables in Vercel dashboard:

- `DATABASE_URL`
- `JWT_SECRET`
- `TRUUTH_API_KEY`
- `TRUUTH_API_SECRET`
- `TRUUTH_TENANT_ALIAS`

### 3. Deploy

```bash
vercel --prod
```

## Document Classification Rules

- **Philippines Passport**: `country.code === "PHL"` AND `documentType.code === "PASSPORT"`
- **Philippines Driver's Licence**: `country.code === "PHL"` AND `documentType.code === "DRIVERS_LICENCE"`
- **Resume**: No classification required

## Security Notes

- All Truuth API credentials are stored as backend environment variables
- Frontend never directly calls Truuth APIs
- JWT tokens are used for user authentication
- Passwords are hashed using bcrypt
- Document files are not stored permanently; only metadata and verification results

## Test Credentials

After registering, you can use any username/password combination to create an account and test the portal.

## License

Private - Truuth Hiring Challenge Submission
