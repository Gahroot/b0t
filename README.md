# Social Cat

Run your social media on autopilot. This app monitors Twitter, YouTube, and Instagram, then uses AI to reply to people, post content, and keep you active 24/7 without lifting a finger.

## What does it actually do?

**For Twitter:**
- Searches for tweets about topics you care about
- Uses AI to write natural replies (not spammy bot stuff)
- Posts tweets and threads automatically
- Tracks trending topics and creates content about them

**For YouTube:**
- Watches for new comments on your videos
- Replies to top comments with AI-generated responses
- Prioritizes comments with high engagement

**For Instagram:**
- Framework is ready, features coming soon

Everything runs on a schedule you control. Set it to reply every 2 hours, post every 4 hours, or whatever works for you.

## Quick Start

**Option 1: Deploy in 5 minutes (easiest)**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/social-cat)

Railway handles the database, hosting, and automatic deployments. You just add your API keys and you're done.

**Option 2: Run it locally**

```bash
git clone https://github.com/yourusername/social-cat.git
cd social-cat
npm install
cp .env.example .env.local

# Generate a secret key
openssl rand -base64 32

# Add that key to .env.local as AUTH_SECRET
# Start the app
npm run dev
```

Open `http://localhost:3000` and login with whatever email/password you set in `.env.local`

## What you need to get started

**Required:**
- OpenAI API key (this powers the AI responses)
- An admin password (just pick one)

**Optional but recommended:**
- Twitter API credentials (for Twitter features)
- YouTube API credentials (for YouTube features)
- Instagram access token (for Instagram features)
- Redis URL (makes jobs survive restarts - Railway provides this free)

The app works without social media credentials, but you'll only be able to test the UI. Connect at least one platform to actually use it.

## How it works

1. You connect your social media accounts through the settings page
2. You tell it what to look for (like "tweets about AI" or "comments on my videos")
3. You customize how the AI should respond (casual, professional, funny, etc)
4. You turn on the automations with a toggle switch
5. The app runs in the background and handles everything

The AI reads the original post/comment, understands the context, and writes a response that sounds like you. You can review everything from the dashboard.

## Tech stack (for developers)

- **Next.js 15** with React 19 and App Router
- **PostgreSQL** for production, SQLite for local dev (auto-detected)
- **Drizzle ORM** for database queries
- **BullMQ + Redis** for reliable job scheduling (or node-cron if you skip Redis)
- **OpenAI GPT-4** for content generation
- **NextAuth v5** for authentication
- **Tailwind CSS** and shadcn/ui for the interface
- **Railway** for deployment (but works anywhere)

## Project structure

```
src/
  app/              Next.js pages and API routes
    api/            REST endpoints for everything
    dashboard/      Main dashboard UI
    settings/       Connect accounts and configure
  components/       React components
  lib/              Core logic
    jobs/           Scheduled automation jobs
    workflows/      Multi-step automation pipelines
    [platform].ts   API clients for Twitter, YouTube, etc
```

## Configuration

All settings live in the database and can be changed from the UI. No need to redeploy to adjust schedules or prompts.

**Job schedules (customizable):**
- Reply to tweets: every 2 hours
- Post tweets: every 4 hours
- Check YouTube comments: every 30 minutes
- Reply to YouTube comments: as needed

**Rate limits (built-in protection):**
- Twitter: 50 actions per hour
- OpenAI: 500 requests per minute
- Automatic retries with exponential backoff

## Important features for reliability

**Circuit breakers** - If an API starts failing, the app stops hitting it and tries again later

**Rate limiting** - Never exceeds API quotas, even if you run multiple jobs at once

**Duplicate prevention** - Tracks what it's already replied to so it never repeats itself

**Job persistence** - With Redis, jobs survive app restarts and redeployments

**Activity logs** - See exactly what happened, when, and why

## Commands for development

```bash
npm run dev             # Start dev server with hot reload
npm run build           # Build for production
npm run lint            # Check code quality
npm run db:push         # Update database schema
npm run db:studio       # Open database browser

# Railway integration
npm run railway:sync    # Sync local .env to Railway
npm run railway:env     # Preview what would sync
```

## Security notes

- OAuth tokens are encrypted before storage
- Single-user app by default (add your own auth if you want multi-user)
- Rate limiting prevents abuse
- All API keys stored in environment variables, never in code

## Need help?

Check the setup guides in `/docs/setup/` for step-by-step instructions with screenshots:
- `TWITTER.md` - Get Twitter API access
- `OPENAI.md` - Get your OpenAI key
- `YOUTUBE.md` - Connect YouTube
- `DEPLOYMENT.md` - Full Railway deployment guide

The dashboard shows alerts when services aren't connected and links directly to setup guides.

## License

MIT - use it however you want
