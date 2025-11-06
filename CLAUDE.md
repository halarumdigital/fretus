# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack TypeScript authentication application with user management. The UI is in Portuguese (pt-BR). The project uses a monorepo structure with separate client and server directories and shared types/schemas.

**Tech Stack:**
- Frontend: React 18 + Vite + TypeScript + Wouter (routing)
- Backend: Express + TypeScript (ESM modules)
- Database: PostgreSQL via Drizzle ORM + Neon serverless adapter
- UI: shadcn/ui (New York style) + Tailwind CSS + Radix UI primitives
- Validation: Zod schemas shared between client and server
- State: TanStack Query for server state

## Development Commands

```bash
# Start development server (runs both frontend and backend)
npm run dev

# Type checking without building
npm run check

# Build for production (builds both client and server)
npm run build

# Start production server
npm run start

# Database commands
npm run db:push         # Push schema changes to database (Drizzle)
npm run db:seed         # Create users table and admin user
npm run db:list-users   # List all users in database
```

## Architecture Overview

### Monorepo Structure

```
client/          # React frontend
  src/
    components/  # React components
      ui/        # shadcn/ui components (auto-generated)
    pages/       # Page components (login, dashboard, usuarios, register)
    hooks/       # Custom React hooks
    lib/         # Utilities and query client
server/          # Express backend
  index.ts       # Server entry point
  routes.ts      # API routes and session setup
  storage.ts     # Database storage layer with IStorage interface
  db.ts          # Drizzle database connection
shared/          # Shared types and schemas
  schema.ts      # Drizzle table schemas + Zod validation schemas
```

### Path Aliases

- `@/*` → `client/src/*` (components, pages, hooks, lib)
- `@shared/*` → `shared/*` (schemas, types)
- `@assets/*` → `attached_assets/*`

### Database Layer

**Storage Pattern:** The codebase uses an `IStorage` interface for data access, implemented by `DatabaseStorage` class. This abstraction allows for easy testing and swapping implementations.

**Schema Definition:** All database schemas are in [shared/schema.ts](shared/schema.ts) using Drizzle ORM's `pgTable` definitions. These schemas:
1. Define PostgreSQL table structure
2. Generate TypeScript types via `$inferSelect`
3. Create Zod validation schemas via `createInsertSchema` from drizzle-zod
4. Provide shared validation between client and server

**Database workflow:**
- Schema changes: Edit [shared/schema.ts](shared/schema.ts)
- Apply changes: Run `npm run db:push`
- Initial setup: Run `npm run db:seed` to create tables and admin user
- List users: Run `npm run db:list-users` to see all users
- Migrations are generated in `./migrations` directory
- Database connection requires `DATABASE_URL` environment variable

**Default Admin User:**
- Email: `admin@fretus.com`
- Password: `admin123` (change after first login!)
- Created automatically by `npm run db:seed`

### Authentication Flow

**Session-based authentication** using `express-session` with PostgreSQL storage (`connect-pg-simple`). Session data includes `userId`, `userEmail`, `userName`, and `isAdmin`.

**API Endpoints:**
- `POST /api/auth/login` - Login with email/password (uses bcrypt for password verification)
- `POST /api/auth/logout` - Destroy session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Create new user (hashes password with bcrypt)
- `GET /api/users` - List all users (requires authentication)

**Security:** Passwords are securely hashed using bcrypt (10 rounds) before being stored in the database. Both login and registration endpoints automatically handle password hashing and verification.

### Frontend Routing

Uses Wouter for client-side routing in [client/src/App.tsx](client/src/App.tsx):

**Auth pages** (no sidebar):
- `/` - Login page
- `/register` - Registration page

**Authenticated pages** (with sidebar):
- `/dashboard` - Main dashboard
- `/usuarios` - User management page

The Router component conditionally renders with or without the sidebar based on route.

### UI Component System

**shadcn/ui Integration:** Uses shadcn/ui component library with configuration in [components.json](components.json). Components are in [client/src/components/ui/](client/src/components/ui/) and should not be manually edited (regenerate via shadcn CLI).

**Design System:** Follow guidelines in [design_guidelines.md](design_guidelines.md) for new UI components. The app uses:
- Tailwind CSS with custom configuration
- CSS variables for theming (supports light/dark mode)
- Radix UI primitives for accessibility
- Custom elevation effects (hover-elevate, active-elevate-2)

**Custom Components:** Application-specific components (like AppSidebar) go in [client/src/components/](client/src/components/).

### Shared Validation

Validation schemas in [shared/schema.ts](shared/schema.ts) are used by both client and server:
- Client: React Hook Form with Zod resolvers
- Server: Zod `safeParse()` on request bodies

This ensures validation rules stay in sync. When adding new forms:
1. Define Drizzle schema in shared/schema.ts
2. Create Zod schema using `createInsertSchema` or custom `z.object()`
3. Use schema in React Hook Form on frontend
4. Use schema in route handlers on backend

### State Management

**Server State:** TanStack Query handles all server state. Query client is configured in [client/src/lib/queryClient.ts](client/src/lib/queryClient.ts).

**UI State:** React Hook Form for form state, custom hooks for toasts and mobile detection in [client/src/hooks/](client/src/hooks/).

**No Global State:** No Redux/Zustand/Context for app state. Rely on React Query's caching.

## Important Conventions

1. **Language:** All UI text, error messages, and user-facing content must be in Portuguese (pt-BR)
2. **Type Safety:** Always use TypeScript; infer types from Drizzle schemas where possible
3. **Module System:** Use ESM imports/exports (not CommonJS)
4. **Styling:** Use Tailwind CSS utility classes; avoid custom CSS files except [client/src/index.css](client/src/index.css)
5. **Forms:** Use React Hook Form + Zod validation + shared schemas
6. **API Errors:** Return consistent JSON error format: `{ message: string, errors?: array }`
