# Overview

This is a modern authentication application built with a React frontend and Express backend. The application implements a login system with form validation, featuring a contemporary UI inspired by platforms like Linear, Notion, and Stripe. The project uses TypeScript throughout and follows a monorepo structure with shared schemas between client and server.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Tooling:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- React Hook Form with Zod resolvers for form validation and schema validation

**UI Framework:**
- shadcn/ui component library (New York style variant)
- Tailwind CSS with custom configuration for styling
- Radix UI primitives for accessible component foundations
- Custom design system with CSS variables for theming (light/dark mode support)

**State Management:**
- TanStack Query (React Query) for server state management
- Custom hooks for UI state (toasts, mobile detection)
- No global state management library; using React Query's caching strategy

**Design Decisions:**
- Component-based architecture with reusable UI components in `client/src/components/ui/`
- Form validation at both client and server levels using shared Zod schemas
- Custom styling system with elevation effects (hover-elevate, active-elevate-2)
- Responsive design with mobile-first approach

## Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- ESM module system (not CommonJS)
- Custom middleware for request logging and JSON parsing

**Data Storage:**
- In-memory storage implementation (`MemStorage` class) for development
- Prepared for PostgreSQL migration via Drizzle ORM
- Database schema defined in `shared/schema.ts` using Drizzle's table definitions
- Currently using Neon serverless PostgreSQL adapter in dependencies

**Authentication Strategy:**
- Simple credential-based authentication (email/password)
- Plain text password storage in current implementation (development only)
- Session management infrastructure prepared (connect-pg-simple for future use)
- No JWT or token-based auth currently implemented

**API Design:**
- RESTful endpoints under `/api` prefix
- Single authentication endpoint: `POST /api/auth/login`
- Consistent error response format with HTTP status codes
- Request/response logging for API routes

## Design Patterns

**Shared Schema Pattern:**
- Single source of truth for data validation in `shared/schema.ts`
- Zod schemas used for both runtime validation and TypeScript type inference
- Drizzle ORM schemas that generate TypeScript types
- Form schemas derived from database schemas using `drizzle-zod`

**Storage Abstraction:**
- Interface-based storage design (`IStorage` interface)
- Allows swapping between in-memory and database implementations
- Async methods throughout for future database compatibility

**Development Workflow:**
- Hot module replacement via Vite in development
- Separate build processes for client and server
- TypeScript compilation checking without emission
- Replit-specific plugins for development experience

## External Dependencies

**Database:**
- Drizzle ORM for type-safe database queries
- Drizzle Kit for migrations management
- Neon Database serverless PostgreSQL driver
- Configuration points to PostgreSQL dialect but currently using in-memory storage

**UI Libraries:**
- Radix UI primitives (30+ component packages for accessibility)
- Lucide React for icons
- class-variance-authority for component variant management
- Tailwind CSS with PostCSS for styling
- Embla Carousel for carousel functionality
- cmdk for command palette patterns

**Form Management:**
- React Hook Form for form state management
- @hookform/resolvers for Zod integration
- Zod for schema validation

**Utilities:**
- date-fns for date manipulation
- clsx and tailwind-merge for conditional className handling
- nanoid for ID generation

**Development Tools:**
- tsx for running TypeScript in Node.js
- esbuild for server bundling in production
- Replit-specific Vite plugins (cartographer, dev-banner, runtime-error-modal)

**Build Configuration:**
- Vite config with path aliases (@, @shared, @assets)
- Custom Tailwind configuration with design tokens
- PostCSS with Tailwind and Autoprefixer

**Notable Architectural Decisions:**
1. **Monorepo Structure:** Client and server code in same repository with shared types and schemas
2. **Type Safety:** End-to-end TypeScript from database schema to UI components
3. **Development vs Production:** In-memory storage for development, PostgreSQL ready for production
4. **No Authentication Middleware:** Currently implementing basic login without session persistence or route guards
5. **Portuguese Language:** UI text and error messages in Brazilian Portuguese (pt-BR)