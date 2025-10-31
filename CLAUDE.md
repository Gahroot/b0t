# b0t

A visual automation platform for building custom workflows. Connect APIs, services, and platforms to create powerful automations without writing code.

## Product Vision

b0t is a workflow automation builder that lets users create custom automation pipelines through a visual interface. Think Zapier/n8n meets Temporal - users can:

- Build multi-step workflows visually
- Connect to any API or service
- Use AI for intelligent automation
- Schedule jobs and handle retries
- Monitor workflow execution in real-time

**Core Philosophy:**
- User-built automations (not pre-defined templates)
- Visual workflow builder with node-based editor
- First-class AI integration for intelligent decisions
- Production-ready reliability (circuit breakers, retries, observability)
- Self-hosted or cloud deployment

## Current State

The codebase currently has pre-built automations organized by category:

**Social Media:** Twitter, YouTube, Instagram
**Content:** WordPress blogging

These serve as:
- Reference implementations for common use cases
- Starting templates users can customize
- Examples of workflow patterns
- Demonstrations of category-based organization

**Next Steps:**
- Build visual workflow editor (node-based UI)
- Create workflow execution engine
- Add connector/integration system
- Migrate existing automations to new system

## Project Structure

```
src/
  ├── app/                 # Next.js 15 App Router
  │   ├── api/            # REST API endpoints
  │   │   ├── auth/       # NextAuth.js authentication
  │   │   ├── workflows/  # Workflow execution & management
  │   │   ├── jobs/       # Job control & triggering
  │   │   ├── services/   # Service status checks
  │   │   ├── connectors/ # Integration configs
  │   │   └── scheduler/  # Cron scheduling
  │   ├── dashboard/      # Main dashboard
  │   ├── workflows/      # Workflow builder & management (coming soon)
  │   ├── social-media/   # Social media automations (Twitter, YouTube, Instagram)
  │   ├── content/        # Content creation automations (WordPress)
  │   ├── setup/          # Initial onboarding
  │   └── settings/       # User settings
  ├── components/         # React components
  │   ├── ui/            # Shadcn/ui components
  │   ├── ai-elements/   # AI streaming UI
  │   ├── automation/    # Automation controls
  │   ├── workflow/      # Workflow builder components
  │   ├── dashboard/     # Dashboard widgets
  │   └── layout/        # Navbar, layouts
  ├── lib/               # Core business logic
  │   ├── jobs/          # BullMQ & cron jobs
  │   ├── workflows/     # Workflow execution engine
  │   ├── connectors/    # API integrations
  │   ├── config/        # System configs
  │   ├── schema.ts      # Drizzle ORM models
  │   ├── db.ts          # Database connection
  │   ├── auth.ts        # Authentication
  │   ├── scheduler.ts   # Job scheduling
  │   └── [platform].ts  # Platform API clients
docs/                    # Setup guides
drizzle/                 # Database migrations
```

## Organization Rules

**Keep code organized and modularized:**
- API routes → `/app/api`, one file per endpoint
- Components → `/components/[category]`, one component per file
- Business logic → `/lib`, grouped by domain (jobs, workflows, connectors)
- Database models → `/lib/schema.ts`
- Tests → Co-located with code as `*.test.ts`

**Modularity principles:**
- Single responsibility per file
- Clear, descriptive file names
- Group related functionality (jobs, workflows, API clients)
- Avoid monolithic files

## Code Quality - Zero Tolerance

After editing ANY file, run:

```bash
npm run lint
npx tsc --noEmit
```

Fix ALL errors/warnings before continuing.

If changes require server restart (not hot-reloadable):
1. Restart: `npm run dev`
2. Read server output/logs
3. Fix ALL warnings/errors before continuing

## Workflow System Architecture

**Workflow Definition:**
- Node-based visual editor (using @xyflow/react)
- Nodes represent actions (API calls, conditions, AI processing, etc.)
- Edges represent data flow between nodes
- Stored as JSON in database

**Workflow Execution:**
- BullMQ for reliable job processing
- Each workflow run is a job
- Support for retries, timeouts, and error handling
- Circuit breakers for external APIs

**Connectors/Integrations:**
- Modular connector system
- Each connector provides: auth, actions, triggers
- Examples: Twitter, OpenAI, Airtable, HTTP requests
- Users can add custom connectors

## Tech Stack

- **Next.js 15** with React 19 and App Router
- **PostgreSQL** for production, SQLite for local dev
- **Drizzle ORM** for database
- **BullMQ + Redis** for job queue (node-cron fallback)
- **@xyflow/react** for workflow builder UI
- **OpenAI SDK** for AI capabilities
- **NextAuth v5** for authentication
- **Tailwind CSS** + shadcn/ui for design system
