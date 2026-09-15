# Urban Mining Connect - Backend

Backend API server for the Urban Mining Connect application built with Express.js and SQLite.

## Directory Structure

```
backend/
├── config/          # Database configuration
├── middleware/      # Custom middleware (rate limiting, RBAC)
├── routes/          # API route handlers
├── server.js        # Main Express server
├── .env.example     # Environment variables template
└── README.md        # This file
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

   The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Materials
- `GET /api/materials` - Get all materials
- `GET /api/materials/:id` - Get material by ID
- `POST /api/materials` - Create new material

### Prices
- `GET /api/prices` - Get all prices
- `GET /api/prices/:id` - Get price by ID
- `POST /api/prices` - Create new price

### Lots
- `GET /api/lots` - Get all lots
- `GET /api/lots/:id` - Get lot by ID
- `POST /api/lots` - Create new lot

### Buyers
- `GET /api/buyers` - Get all buyers
- `GET /api/buyers/:id` - Get buyer by ID
- `POST /api/buyers` - Create new buyer

### Handover
- `GET /api/handover` - Get all handovers
- `GET /api/handover/:id` - Get handover by ID
- `POST /api/handover` - Create new handover

### Earnings
- `GET /api/earnings` - Get all earnings
- `GET /api/earnings/:id` - Get earning by ID
- `POST /api/earnings` - Create new earning

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Admin
- `GET /api/admin/dashboard` - Admin dashboard (admin only)
- `GET /api/admin/users` - List all users (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)

### Recovery
- `POST /api/recovery/backup` - Backup database
- `POST /api/recovery/restore` - Restore database

### Upload
- `POST /api/upload` - Upload file

## Middleware

### Rate Limiting
- API limiter: 100 requests per 15 minutes
- Auth limiter: 5 requests per 15 minutes

### RBAC (Role-Based Access Control)
- Admin: Full access
- User: Limited access
- Guest: Read-only access

## Database

The application uses SQLite with the schema defined in `schema.sql`. The database is automatically initialized on first run.

## Environment Variables

See `.env.example` for all available configuration options.
