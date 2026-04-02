# Telegram Bulk Messaging SaaS

Production-ready multi-user SaaS platform built with Next.js App Router, MongoDB, NextAuth, and Telegram Bot API for sending bulk campaigns with logs and campaign history.

## Tech Stack

- Next.js (App Router, JavaScript, `src/` directory)
- React
- Tailwind CSS (v4)
- MongoDB + Mongoose
- NextAuth (Credentials provider)
- Telegram Bot API

## Features

- User registration and login with hashed passwords
- Protected dashboard route and protected API routes
- Telegram bot token + message + recipient IDs input
- Recipients use Telegram chat IDs only
- Recipient upload from `.txt` or `.csv`
- Saved Telegram ID contact manager
- Bulk message sending with per-recipient status logs
- Rate limiting delay between messages
- Live progress updates while sending (`Sending X/Y`)
- Campaign history persisted to MongoDB
- Responsive SaaS dashboard with sidebar + main panel

## Environment Variables

Copy `.env.example` to `.env.local` and fill the values:

```bash
cp .env.example .env.local
```

Required variables:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm start
```

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.js
│   │   ├── campaigns/
│   │   │   └── route.js
│   │   ├── register/
│   │   │   └── route.js
│   │   └── send-message/
│   │       └── route.js
│   ├── dashboard/
│   │   └── page.js
│   ├── login/
│   │   └── page.js
│   ├── register/
│   │   └── page.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   ├── AuthCard.js
│   ├── DashboardClient.js
│   └── Providers.js
├── lib/
│   ├── auth.js
│   ├── db.js
│   ├── helpers.js
│   └── telegram.js
└── models/
		├── Campaign.js
		└── User.js
```

## API Behavior

### `POST /api/register`

Registers a new user.

Request body:

```json
{
	"name": "John Doe",
	"email": "john@example.com",
	"password": "secret123"
}
```

### `POST /api/send-message`

Protected route. Sends Telegram messages sequentially with a delay (rate limiting).

Request body:

```json
{
	"botToken": "123:ABC",
	"message": "Hello from campaign",
	"recipients": ["123456", "-1001234567890"],
	"delayMs": 700
}
```

### `GET/POST/DELETE /api/contacts`

Protected route for managing saved Telegram IDs.

- `GET` returns saved contacts
- `POST` upserts a saved Telegram ID
- `DELETE` removes a contact mapping by `contactId`

Returns a streaming response (`text/event-stream`) with progress and completion events.

### `GET /api/campaigns`

Protected route. Returns last 20 campaigns for the logged-in user.

## Security Notes

- Passwords are hashed with `bcryptjs`
- API routes verify authenticated session with NextAuth
- Dashboard route is server-protected with `getServerSession`
- User data is scoped by user ID for campaign retrieval
