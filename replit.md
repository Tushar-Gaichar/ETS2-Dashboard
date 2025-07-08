# ETS2 Dashboard

## Overview

This is a full-stack web application that provides a real-time dashboard for Euro Truck Simulator 2 (ETS2) telemetry data. The application displays truck information, job details, navigation data, and various vehicle status indicators in a modern, responsive interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: Radix UI components with shadcn/ui styling system
- **State Management**: React hooks with TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Real-time Communication**: WebSocket connection for live telemetry data

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL-based sessions using connect-pg-simple
- **Real-time Communication**: WebSocket server for telemetry streaming
- **Development**: Hot reloading with Vite integration

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema**: Shared TypeScript schemas using Zod for validation
- **Migrations**: Database migrations managed by Drizzle Kit

## Key Components

### Telemetry System
- **Data Source**: ETS2 telemetry data (supports Windows memory-mapped file access)
- **Fallback**: Demo data generation for development and non-Windows environments
- **Real-time Updates**: WebSocket streaming of telemetry data to connected clients
- **Data Validation**: Zod schemas ensure type safety between client and server

### Dashboard Interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Component Structure**: 
  - `TelemetryGauge`: Circular progress indicators for metrics
  - `TruckInfo`: Vehicle specifications and status
  - `JobInfo`: Current delivery job details
  - `StatusIndicators`: Engine and lighting status
  - `NavigationInfo`: Route and ETA information
  - `ConnectionModal`: Server connection interface

### Storage System
- **Interface**: `IStorage` abstraction for data operations
- **Implementation**: In-memory storage with PostgreSQL backend capability
- **Data Types**: User management, telemetry data, and connection status

## Data Flow

1. **Telemetry Collection**: Server reads ETS2 telemetry data from memory-mapped files (Windows) or generates demo data
2. **Data Processing**: Raw telemetry data is validated against Zod schemas
3. **Storage**: Processed data is stored in-memory and/or PostgreSQL database
4. **Real-time Distribution**: WebSocket server broadcasts updates to connected clients
5. **Client Rendering**: React components receive and display telemetry data with real-time updates

## External Dependencies

### Core Dependencies
- **Database**: `@neondatabase/serverless` for PostgreSQL connectivity
- **ORM**: `drizzle-orm` and `drizzle-zod` for database operations
- **UI Framework**: Comprehensive Radix UI component library
- **Styling**: `tailwindcss` with `class-variance-authority` for component variants
- **Forms**: `react-hook-form` with `@hookform/resolvers` for form handling
- **Date Handling**: `date-fns` for date manipulation
- **WebSocket**: Native WebSocket API for real-time communication

### Development Dependencies
- **Build Tools**: Vite with React plugin and TypeScript support
- **Development Experience**: Replit-specific plugins for enhanced development
- **Code Quality**: TypeScript for type safety and better development experience

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds the React application to `dist/public`
2. **Backend Build**: esbuild bundles the Express server to `dist/index.js`
3. **Database Setup**: Drizzle Kit manages database schema and migrations

### Environment Configuration
- **Development**: `NODE_ENV=development` with hot reloading and development tools
- **Production**: `NODE_ENV=production` with optimized builds and static file serving
- **Database**: `DATABASE_URL` environment variable for PostgreSQL connection

### Server Configuration
- **Static Files**: Production server serves built React app from `dist/public`
- **API Routes**: RESTful endpoints prefixed with `/api/`
- **WebSocket**: WebSocket server mounted on `/ws` path
- **Error Handling**: Centralized error handling middleware

### Database Management
- **Schema**: Defined in `shared/schema.ts` for type safety
- **Migrations**: Generated and applied using `drizzle-kit`
- **Connection**: Serverless PostgreSQL connection via Neon Database

The application is designed to be easily deployable on various platforms with minimal configuration, requiring only a PostgreSQL database connection string and appropriate environment variables.