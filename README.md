# OneClick Timestamps MVP

A SaaS application for generating YouTube timestamps using AI.

## Features

- **Authentication**: Clerk (email/password + Google OAuth)
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Payments**: LemonSqueezy subscriptions
- **AI**: OpenAI GPT-4 for timestamp generation
- **YouTube Integration**: Automatic caption fetching

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `env.example.txt` and create `.env.local`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Neon Database
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# OpenAI
OPENAI_API_KEY=sk-...

# YouTube Data API
YOUTUBE_API_KEY=AIza...

# LemonSqueezy
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
NEXT_PUBLIC_LEMONSQUEEZY_PRODUCT_ID=...
NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID=...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Clerk

1. Create account at [clerk.com](https://clerk.com)
2. Create new application
3. Enable email/password and Google OAuth
4. Copy API keys to `.env.local`

### 4. Set Up Neon Database

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string to `.env.local`
4. Push database schema:

```bash
npm run db:push
```

### 5. Set Up LemonSqueezy

1. Create account at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Create store
3. Create products:
   - Free Plan (for reference)
   - Pro Plan ($9/month)
4. Set up webhook endpoint: `https://your-domain.com/api/webhooks/lemonsqueezy`
5. Copy API keys and product IDs to `.env.local`

### 6. Set Up OpenAI

1. Create account at [platform.openai.com](https://platform.openai.com)
2. Generate API key
3. Add to `.env.local`

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Management

```bash
# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── sign-in/           # Auth pages
│   └── sign-up/
├── components/            # React components
│   ├── dashboard/
│   └── output/
├── lib/                   # Core services
│   ├── ai/               # AI timestamp generation
│   ├── auth/             # User authentication
│   ├── db/               # Database schema & client
│   ├── payments/         # LemonSqueezy integration
│   ├── transcript/       # Transcript parsing
│   └── youtube/          # YouTube integration
└── middleware.ts         # Clerk route protection
```

## API Routes

- `POST /api/projects/create` - Create project and generate timestamps
- `GET /api/projects` - Get all user projects
- `GET /api/projects/[id]` - Get project details
- `PATCH /api/projects/[id]` - Update timestamps
- `DELETE /api/projects/[id]` - Delete project
- `POST /api/webhooks/lemonsqueezy` - LemonSqueezy webhook handler

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Make sure to update:
- `NEXT_PUBLIC_APP_URL` to your production domain
- LemonSqueezy webhook URL
- Clerk redirect URLs

## Usage Limits

- **Free Plan**: 3 generations/month
- **Pro Plan**: Unlimited generations

## Support

For issues or questions, please contact support.
