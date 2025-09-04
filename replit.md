# What's the Move? - Campus Event Discovery App

## Overview

What's the Move? is a location-based event discovery platform designed for college students to find and create campus events. The application allows users to discover parties, concerts, study groups, and social events happening around their campus through an interactive map interface and event listings. Users can search for events by category, location, and time, as well as create their own events and RSVP to others.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using React with TypeScript, utilizing a modern component-based architecture:

- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for fast development and optimized production builds

The application follows a page-based routing structure with protected routes for authenticated users. The UI is mobile-first with responsive design patterns.

### Backend Architecture
The backend is an Express.js REST API with the following structure:

- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage
- **API Structure**: RESTful endpoints organized by feature domains

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database
- **ORM**: Drizzle ORM with schema definitions in TypeScript
- **Session Storage**: PostgreSQL table for persistent sessions
- **Migrations**: Drizzle Kit for database schema migrations

Key database tables include:
- `users`: User profiles with university and graduation year
- `events`: Event details with location, category, and timing
- `rsvps`: User responses to events
- `sessions`: Authentication session storage

### Authentication and Authorization
- **Provider**: Replit Auth (OpenID Connect)
- **Session Management**: Server-side sessions with PostgreSQL storage
- **Protection**: Route-level authentication checks
- **User Context**: React Query for user state management
- **Security**: HTTP-only cookies with secure session handling

### External Service Integrations
The application integrates with multiple external APIs for comprehensive event discovery:

- **Ticketmaster API**: For discovering concerts, sports events, and entertainment
- **Meetup API**: For community events and group gatherings
- **Location Services**: Browser geolocation API for user positioning
- **Replit Auth**: For seamless authentication in the Replit environment

The external service integration follows a facade pattern where multiple event sources are normalized into a common event interface, allowing the frontend to display events from different sources uniformly.

### Development and Deployment
- **Development**: Vite dev server with hot module replacement
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Environment**: Designed for Replit deployment with specific optimizations
- **Database Provisioning**: Automated database setup through environment variables