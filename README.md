# b0t

Build custom automation workflows with a visual editor. Connect APIs, services, and platforms to create powerful automations without writing code.

## What is b0t?

b0t is a self-hosted automation platform that lets you build custom workflows through a visual, node-based editor. Think Zapier or n8n, but with first-class AI integration and production-grade reliability built-in.

**Key Features:**
- Visual workflow builder (drag-and-drop nodes)
- Connect any API or service
- Built-in AI actions for intelligent automation
- Production-ready (circuit breakers, retries, rate limiting)
- Real-time workflow monitoring
- Self-hosted or cloud deployment

## Current State

b0t is in early development. The current codebase includes:

**Working:**
- Core infrastructure (Next.js, DB, job queue)
- Pre-built social media automations (Twitter, YouTube, Instagram, WordPress)
- Authentication and user management
- Job scheduling with BullMQ/Redis
- AI integration with OpenAI

**In Progress:**
- Visual workflow builder
- Connector/integration system
- Workflow execution engine
- Templates library

The existing social media automations serve as reference implementations and will be migrated to the new workflow system.

## Quick Start

**Prerequisites:**
- Node.js 20+
- OpenAI API key (for AI features)
- Optional: Redis (for persistent job queue)

**Run Locally:**

```bash
git clone https://github.com/yourusername/b0t.git
cd b0t
npm install

# Setup environment
cp .env.example .env.local
# Generate auth secret
openssl rand -base64 32
# Add to .env.local as AUTH_SECRET

# Start the app
npm run dev
```

Open `http://localhost:3000` and login with credentials from `.env.local`

**Deploy to Railway:**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/b0t)

Railway handles database, Redis, and automatic deployments. Just add your API keys.

## How It Works (Vision)

1. **Build Workflows Visually**
   - Drag nodes onto canvas (triggers, actions, conditions, AI)
   - Connect nodes to define data flow
   - Configure each node (API calls, transformations, etc.)

2. **Connect Services**
   - Pre-built connectors for popular APIs
   - HTTP request node for custom integrations
   - OAuth handling built-in

3. **Add Intelligence**
   - AI nodes for content generation, classification, extraction
   - Decision nodes based on AI analysis
   - Custom prompts and model selection

4. **Run Reliably**
   - Scheduled or trigger-based execution
   - Automatic retries with exponential backoff
   - Circuit breakers for failing APIs
   - Activity logs and monitoring

## Example Use Cases

- **Social Media Automation:** Monitor mentions, generate replies, schedule posts
- **Content Pipeline:** Scrape content, summarize with AI, publish to blog
- **Data Processing:** Fetch data from API, transform, sync to database
- **Notification Workflows:** Monitor events, filter with AI, send alerts
- **Lead Qualification:** Receive form submission, score with AI, route to CRM

## Tech Stack

- **Next.js 15** - React 19, App Router, Server Actions
- **PostgreSQL** - Production database (SQLite for local dev)
- **Drizzle ORM** - Type-safe database queries
- **BullMQ + Redis** - Reliable job queue (node-cron fallback)
- **@xyflow/react** - Visual workflow builder
- **OpenAI SDK** - AI capabilities
- **NextAuth v5** - Authentication
- **Tailwind CSS + shadcn/ui** - Design system

## Project Structure

```
src/
  ├── app/              # Next.js pages and API routes
  │   ├── api/         # REST endpoints
  │   ├── dashboard/   # Main dashboard
  │   ├── workflows/   # Workflow builder (coming soon)
  │   └── settings/    # Configuration
  ├── components/       # React components
  │   ├── ui/          # Design system
  │   ├── workflow/    # Workflow builder UI (coming soon)
  │   └── automation/  # Automation controls
  ├── lib/             # Core business logic
  │   ├── jobs/        # Job scheduling
  │   ├── workflows/   # Workflow execution engine (coming soon)
  │   ├── connectors/  # API integrations
  │   └── schema.ts    # Database models
```

## Development

**Run dev server:**
```bash
npm run dev
```

**Code quality:**
```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test          # Vitest
```

**Database:**
```bash
npm run db:push       # Push schema changes
npm run db:studio     # Visual database browser
```

## Configuration

All automation settings are stored in the database and configurable through the UI.

**Environment Variables (`.env.local`):**
```bash
# Required
OPENAI_API_KEY=         # For AI features
AUTH_SECRET=            # Generate with: openssl rand -base64 32
ADMIN_EMAIL=            # Admin login
ADMIN_PASSWORD=         # Admin password

# Optional
DATABASE_URL=           # PostgreSQL (defaults to SQLite)
REDIS_URL=              # For persistent jobs
UPSTASH_REDIS_REST_URL= # For rate limiting
```

## Reliability Features

- **Circuit Breakers** - Stop calling failing APIs, retry later
- **Rate Limiting** - Never exceed API quotas
- **Duplicate Prevention** - Track processed items
- **Job Persistence** - Workflows survive restarts (with Redis)
- **Error Handling** - Retries with exponential backoff
- **Observability** - Activity logs and monitoring

## Roadmap

**Phase 1 (Current):**
- [x] Core infrastructure
- [x] Job scheduling system
- [x] Pre-built social automations
- [ ] Visual workflow builder
- [ ] Workflow execution engine

**Phase 2:**
- [ ] Connector marketplace
- [ ] Workflow templates
- [ ] Advanced AI nodes
- [ ] Multi-user support
- [ ] Team collaboration

**Phase 3:**
- [ ] Workflow versioning
- [ ] A/B testing
- [ ] Analytics dashboard
- [ ] Webhook triggers
- [ ] API for headless usage

## Contributing

Contributions welcome! This project is in early development and evolving quickly.

**Areas needing help:**
- Visual workflow builder UI
- Additional connectors/integrations
- Documentation and examples
- Testing and bug reports

## License

MIT - use it however you want

---

**Note:** b0t is in active development. Expect breaking changes as we build toward v1.0.
