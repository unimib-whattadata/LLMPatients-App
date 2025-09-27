# AI Code Generation Guidelines for ePatients Project

## Overview

This document provides comprehensive guidelines for generating code in the **ePatients** project, a Next.js 15 application for virtual patient therapy simulations. The project leverages cutting-edge technologies and follows modern development patterns to create a robust, scalable, and maintainable codebase.

### Project Context
- **Domain**: Healthcare simulation and medical education
- **Purpose**: Virtual patient interactions for therapy training
- **Architecture**: Full-stack TypeScript application with modern tooling
- **Deployment**: Production-ready with comprehensive security and performance optimizations

## Technology Stack & Documentation References

### Core Framework Stack
- **[Next.js 15](https://nextjs.org/docs)** - React framework with App Router, Server Components, and advanced optimization features
- **[TypeScript 5.9+](https://www.typescriptlang.org/docs/)** - Strict mode with comprehensive type safety
- **[React 19](https://react.dev/learn)** - Latest React features with concurrent rendering
- **[Node.js](https://nodejs.org/en/docs/)** - Runtime environment optimized for serverless deployment

### UI & Styling Stack
- **[Tailwind CSS v4](https://tailwindcss.com/docs)** - Utility-first CSS framework with CSS variables and advanced theming
- **[shadcn/ui](https://ui.shadcn.com/)** - Accessible, customizable component library built on Radix UI
- **[Radix UI](https://www.radix-ui.com/)** - Low-level UI primitives for accessibility and customization
- **[Lucide React](https://lucide.dev/)** - Beautiful, customizable icon library

### Backend & Data Stack
- **[tRPC v11](https://trpc.io/docs)** - End-to-end typesafe APIs with React Query integration
- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript-first ORM with excellent performance and developer experience
- **[SQLite](https://www.sqlite.org/docs.html)** - Embedded database for development and lightweight production
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation library

### Authentication & Security Stack
- **[NextAuth.js v5 (Auth.js)](https://authjs.dev/)** - Complete authentication solution with advanced session management
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** - Password hashing and verification
- **[JWT](https://jwt.io/)** - JSON Web Tokens for session management

### Development & Build Tools
- **[Turbopack](https://turbo.build/pack/docs)** - Next.js bundler for faster development builds
- **[ESLint](https://eslint.org/docs/)** - Code linting with TypeScript and Next.js rules
- **[Prettier](https://prettier.io/docs/)** - Code formatting with Tailwind CSS plugin
- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager

## Table of Contents

1. [Project Architecture](#project-architecture)
2. [Package-Specific Guidelines](#package-specific-guidelines)
3. [Folder Structure & Organization](#folder-structure--organization)
4. [Naming Conventions](#naming-conventions)
5. [Code Style & Formatting](#code-style--formatting)
6. [Component Patterns](#component-patterns)
7. [Styling Guidelines](#styling-guidelines)
8. [Authentication & Security](#authentication--security)
9. [Database & Data Layer](#database--data-layer)
10. [API Design Patterns](#api-design-patterns)
11. [Error Handling](#error-handling)
12. [Accessibility Guidelines](#accessibility-guidelines)
13. [Performance & Optimization](#performance--optimization)
14. [Testing Patterns](#testing-patterns)
15. [Import Management](#import-management)
16. [Comments & Documentation](#comments--documentation)
17. [Environment & Configuration](#environment--configuration)
18. [Deployment & Production](#deployment--production)

## Project Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.9+ with strict mode
- **Styling**: Tailwind CSS v4 with custom design system
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: tRPC v11 with React Query
- **Database**: SQLite with Drizzle ORM
- **Authentication**: NextAuth v5 (beta) with JWT strategy
- **Validation**: Zod for runtime type validation
- **Deployment**: Production-ready with environment validation

### Core Architectural Principles

1. **End-to-End Type Safety**
   - TypeScript strict mode throughout the entire stack
   - tRPC for type-safe API communication
   - Drizzle ORM for type-safe database operations
   - Zod schemas for runtime validation

2. **Component-Driven Development**
   - Modular, reusable component architecture
   - Composition over inheritance patterns
   - Clear separation of concerns between UI, logic, and data

3. **Performance-First Approach**
   - Server Components for optimal loading performance
   - Selective client-side hydration
   - Code splitting and lazy loading
   - Optimized bundle sizes with tree shaking

4. **Security by Design**
   - Role-based access control (RBAC)
   - Admin impersonation functionality
   - Comprehensive input validation
   - Secure session management with JWT

5. **Accessibility & Inclusivity**
   - WCAG 2.1 AA compliance
   - Semantic HTML structure
   - Keyboard navigation support
   - Screen reader optimization

6. **Developer Experience Excellence**
   - Clear, consistent patterns and conventions
   - Comprehensive error handling
   - Detailed documentation and comments
   - Automated linting and formatting

## Package-Specific Guidelines

### Next.js 15 App Router Patterns

**Server Components (Default)**
```typescript
// app/patients/page.tsx
import { Suspense } from 'react';
import { PatientGrid } from '~/components/features/explore-patients/PatientGrid';
import { PatientGridSkeleton } from '~/components/ui/skeleton-variants';

// Server Component - runs on server, can directly access database
export default async function PatientsPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Virtual Patients</h1>
      <Suspense fallback={<PatientGridSkeleton />}>
        <PatientGrid />
      </Suspense>
    </main>
  );
}

// Metadata generation for SEO
export async function generateMetadata() {
  return {
    title: 'Virtual Patients | ePatients',
    description: 'Explore our collection of virtual patients for therapy training.',
  };
}
```

**Client Components (Interactive)**
```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '~/components/ui/button';

// Client Component - runs in browser, has access to hooks and state
export function InteractivePatientCard({ patient }: PatientCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleStartSession = useCallback(async () => {
    setIsLoading(true);
    try {
      router.push(`/therapeutic-journey/${patient.id}/${patient.slug}`);
    } finally {
      setIsLoading(false);
    }
  }, [patient.id, patient.slug, router]);

  return (
    <Button 
      onClick={handleStartSession}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? 'Starting...' : `Start Session with ${patient.name}`}
    </Button>
  );
}
```

### NextAuth.js v5 Patterns

**Configuration (auth.ts)**
```typescript
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "~/server/db";
import { validateUserCredentials } from "~/server/auth/user-validation";

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await validateUserCredentials(
          credentials.email,
          credentials.password
        );

        return user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        } : null;
      },
    }),
  ],

  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as "admin" | "user";
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

### Drizzle ORM Patterns

**Schema Definition**
```typescript
// server/db/schema.ts
import { relations, sql } from "drizzle-orm";
import { sqliteTableCreator, text, integer, index } from "drizzle-orm/sqlite-core";

const createTable = sqliteTableCreator((name) => `epatients_${name}`);

export const patients = createTable(
  "patient",
  {
    id: text("id").notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name", { length: 255 }).notNull(),
    difficulty: integer("difficulty").notNull(), // 1-3
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => ({
    difficultyIdx: index("patient_difficulty_idx").on(table.difficulty),
    activeIdx: index("patient_active_idx").on(table.isActive),
  })
);

// Relations
export const patientsRelations = relations(patients, ({ many }) => ({
  therapySessions: many(therapySessions),
}));
```

### Tailwind CSS v4 Patterns

**Theme Configuration**
```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Custom colors using CSS variables */
  --color-primary-green: #8B9769;
  --color-text-primary: #FFFFFF;
  --color-page-background: #1A1D19;
  
  /* Custom spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  
  /* Custom breakpoints */
  --breakpoint-xs: 475px;
  --breakpoint-3xl: 1600px;
}

/* Use CSS variables directly */
.patient-card {
  background-color: var(--color-card-background);
  color: var(--color-text-primary);
}
```

### shadcn/ui Component Patterns

**Installation**
```bash
# Install components via CLI
npx shadcn@latest add button card input label

# Install specific components
npx shadcn@latest add select dialog
```

**Custom Variants**
```typescript
// components/ui/skeleton-variants.tsx
import { Skeleton } from "./skeleton";
import { cn } from "~/lib/utils";

export function PatientCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4 border rounded-lg", className)}>
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}
```

### tRPC API Patterns

**Router Definition**
```typescript
// server/api/routers/patients.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";

export const patientsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(patients.isActive, true)];
      
      if (input.search) {
        conditions.push(like(patients.name, `%${input.search}%`));
      }

      return await ctx.db.query.patients.findMany({
        where: and(...conditions),
        limit: input.limit,
      });
    }),
});
```

## Folder Structure & Organization

### Root Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth route group
│   ├── dashboard/         # Protected dashboard routes
│   ├── admin/             # Admin-only routes
│   └── api/               # API routes (NextAuth, tRPC)
├── components/            # Reusable UI components
│   ├── ui/                # shadcn/ui base components
│   ├── common/            # Common application components
│   ├── features/          # Feature-specific components
│   ├── layout/            # Layout components
│   └── navigation/        # Navigation components
├── server/                # Server-side code
│   ├── api/               # tRPC routers and procedures
│   ├── auth/              # Authentication configuration
│   └── db/                # Database schema and utilities
├── lib/                   # Utility functions and constants
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── styles/                # Global styles and CSS
└── trpc/                  # tRPC client configuration
```

### Component Organization Principles

1. **Feature-Based Grouping**: Group components by feature/domain
2. **Barrel Exports**: Use `index.ts` files for clean imports
3. **Single Responsibility**: One component per file
4. **Co-location**: Keep related files together

### File Naming Patterns
- **Components**: PascalCase (e.g., `PatientCard.tsx`)
- **Utilities**: camelCase (e.g., `slugify.ts`)
- **Constants**: camelCase (e.g., `difficulty.ts`)
- **Types**: PascalCase interfaces, camelCase files (e.g., `index.ts`)

## Naming Conventions

### Components
- Use PascalCase for component names
- Use descriptive, domain-specific names
- Prefix with feature/domain when needed

```typescript
// Good
export function PatientCard({ patient }: PatientCardProps) {}
export function TherapySessionTimeline({ sessions }: TimelineProps) {}

// Avoid
export function Card() {} // Too generic
export function Component1() {} // Meaningless
```

### Variables and Functions
- Use camelCase for variables and functions
- Use descriptive names that explain intent
- Prefix boolean variables with `is`, `has`, `should`, `can`

```typescript
// Good
const isAuthenticated = session?.user?.id && session?.user?.email;
const hasPermission = user.role === 'admin';
const shouldShowModal = isOpen && !isLoading;

// Function naming
const validateUserSession = (session: Session) => {};
const createPatientSlug = (name: string) => {};
```

### Constants
- Use SCREAMING_SNAKE_CASE for module-level constants
- Use camelCase for local constants
- Group related constants in objects

```typescript
// Good
export const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const DIFFICULTY_LEVELS = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
} as const;

const maxRetries = 3;
```

### Database and Schema
- Use snake_case for database table and column names
- Use descriptive table names (plural nouns)
- Prefix with project name for multi-project schemas

```typescript
// Good
export const patients = createTable("patient", (d) => ({
  id: d.text({ length: 255 }).notNull().primaryKey(),
  smallDescription: d.text({ length: 500 }).notNull(),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
}));
```

## Code Style & Formatting

### TypeScript Configuration
- Use strict mode with all strict checks enabled
- Enable `noUncheckedIndexedAccess` for safer array/object access
- Use path aliases for clean imports

```typescript
// tsconfig.json key settings
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "verbatimModuleSyntax": true,
  "paths": {
    "~/*": ["./src/*"],
    "@/components/*": ["./src/components/*"],
    "@/lib/*": ["./src/lib/*"]
  }
}
```

### ESLint Rules
- Use TypeScript ESLint recommended configs
- Prefer `type` imports with inline syntax
- Enforce consistent import ordering
- Use Drizzle-specific rules for database operations

```typescript
// Good - inline type imports
import { type NextAuthConfig, type Session } from "next-auth";
import { eq, and, like } from "drizzle-orm";

// Drizzle safety - always use WHERE clauses
await db.update(users).set({ name: "John" }).where(eq(users.id, userId));
```

### Prettier Configuration
- Use default Prettier settings with Tailwind plugin
- Automatic class sorting for Tailwind classes
- Consistent formatting across all files

## Component Patterns

### Component Structure
Follow this consistent structure for all components:

```typescript
// 1. Imports (external, internal, types)
import React from "react";
import Link from "next/link";
import { type Patient } from "~/types";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

// 2. Types and interfaces
interface PatientCardProps {
  patient: Patient;
  className?: string;
}

// 3. Component implementation with JSDoc
/**
 * PatientCard Component
 *
 * Displays patient information in a card format with enhanced styling and accessibility.
 * Shows patient demographics, psychological profile, difficulty level, and estimated duration.
 *
 * @param patient - Patient object containing all patient information
 * @returns JSX element representing a patient card
 */
export function PatientCard({ patient, className }: PatientCardProps) {
  // 4. Hooks and state
  const [isLoading, setIsLoading] = useState(false);
  
  // 5. Event handlers and functions
  const handleClick = useCallback(() => {
    // Implementation
  }, []);

  // 6. Early returns for loading/error states
  if (!patient) {
    return <PatientCardSkeleton />;
  }

  // 7. Main render
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      {/* Component content */}
    </Card>
  );
}
```

### Component Composition Patterns

1. **Compound Components**: Use for complex UI elements
```typescript
export function PatientCard({ children, ...props }) {
  return <Card {...props}>{children}</Card>;
}

PatientCard.Header = function PatientCardHeader({ children }) {
  return <CardHeader>{children}</CardHeader>;
};

PatientCard.Content = function PatientCardContent({ children }) {
  return <CardContent>{children}</CardContent>;
};
```

2. **Render Props**: Use for flexible, reusable logic
```typescript
interface DataFetcherProps<T> {
  children: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode;
  fetcher: () => Promise<T>;
}
```

3. **Higher-Order Components**: Use sparingly, prefer hooks
```typescript
// Prefer custom hooks over HOCs
function usePatientData(patientId: string) {
  return api.patients.getPatientById.useQuery({ id: patientId });
}
```

### State Management Patterns

1. **Local State**: Use `useState` for component-specific state
2. **Server State**: Use tRPC queries and mutations
3. **URL State**: Use Next.js router for navigation state
4. **Form State**: Use controlled components with validation

```typescript
// Good - server state with tRPC
const { data: patients, isLoading } = api.patients.getExplorationPatients.useQuery({
  difficulty: selectedDifficulties,
  searchQuery: searchTerm,
});

// Good - form state with controlled components
const [formData, setFormData] = useState({
  name: '',
  email: '',
  role: 'user' as const,
});
```

## Styling Guidelines

### Tailwind CSS v4 Usage

The project uses Tailwind CSS v4 with a custom design system. Follow these patterns:

```typescript
// Use the cn() utility for conditional classes
import { cn } from "~/lib/utils";

const Button = ({ variant, size, className, ...props }) => {
  return (
    <button
      className={cn(
        // Base classes
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all",
        // Variant classes
        variant === "primary" && "[color:var(--color-text-primary)] hover:opacity-90 [background-color:var(--color-primary-green)]",
        variant === "outline" && "border-2 border-[#C69A39] [color:var(--color-text-primary)] hover:bg-[#C69A39]",
        // Size classes
        size === "default" && "h-9 px-4 py-2",
        size === "sm" && "h-8 px-3 py-2",
        // Custom classes
        className
      )}
      {...props}
    />
  );
};
```

### Design System Variables

Use CSS custom properties for consistent theming:

```css
/* Use these variables in components */
:root {
  --color-primary-green: #8B9769;
  --color-text-primary: #FFFFFF;
  --color-page-background: #1A1D19;
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
}
```

### Responsive Design Patterns

```typescript
// Use responsive classes consistently
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {/* Content */}
</div>

// Use container queries when supported
<div className="container-query">
  <div className="@md:flex @md:items-center @md:justify-between">
    {/* Content */}
  </div>
</div>
```

### Component-Specific Styling

```typescript
// Use style prop for dynamic styles, classes for static ones
<Card 
  className="h-full flex flex-col"
  style={{ backgroundColor: '#2E322B' }}
>
  {/* Content */}
</Card>
```

## Authentication & Security

### NextAuth v5 Patterns

The project uses NextAuth v5 with comprehensive session validation:

```typescript
// Session validation pattern
const { data: session, status } = useSession({
  required: false,
  onUnauthenticated() {
    console.log("User not authenticated");
  },
});

const isAuthenticated = useCallback(() => {
  return !!(
    session?.user?.id &&
    session?.user?.email &&
    status === "authenticated"
  );
}, [session, status]);
```

### Role-Based Access Control

```typescript
// Component-level protection
if (session?.user?.role !== "admin") {
  return <UnauthorizedMessage />;
}

// tRPC procedure protection
export const adminOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required to perform this action",
    });
  }
  return next({ ctx });
});
```

### Impersonation Support

The project includes admin impersonation functionality:

```typescript
// Check for impersonation context
const impersonationContext = session?.impersonation;
const isImpersonating = impersonationContext?.isImpersonating;

if (isImpersonating) {
  // Handle impersonated session logic
  console.log(`Admin ${impersonationContext.originalAdminId} impersonating ${impersonationContext.targetUserId}`);
}
```

### Security Best Practices

1. **Input Validation**: Always validate with Zod schemas
2. **SQL Injection Prevention**: Use Drizzle ORM parameterized queries
3. **CSRF Protection**: Enabled by default in NextAuth
4. **Secure Cookies**: Configured for production environments
5. **Session Validation**: Comprehensive database validation in callbacks

```typescript
// Always validate inputs
const createPatientSchema = z.object({
  name: z.string().min(1).max(255),
  difficulty: z.number().min(1).max(3),
  estimatedDuration: z.number().min(5).max(180),
});

// Use Drizzle ORM for safe database operations
await ctx.db
  .update(patients)
  .set({ name: input.name })
  .where(eq(patients.id, input.id));
```

## Database & Data Layer

### Drizzle ORM Patterns

```typescript
// Schema definition pattern
export const patients = createTable(
  "patient",
  (d) => ({
    id: d.text({ length: 255 }).notNull().primaryKey().$defaultFn(() => randomUUID()),
    name: d.text({ length: 255 }).notNull(),
    difficulty: d.integer({ mode: "number" }).notNull(),
    isActive: d.integer({ mode: "boolean" }).default(true).notNull(),
    createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  }),
  (t) => [
    // Always add indexes for query patterns
    index("patient_difficulty_idx").on(t.difficulty),
    index("patient_active_idx").on(t.isActive),
    index("patient_name_idx").on(t.name),
  ],
);

// Relations definition
export const patientsRelations = relations(patients, ({ many }) => ({
  therapySessions: many(therapySessions),
}));
```

### Query Patterns

```typescript
// Use query builder for complex queries
const whereConditions = [eq(patients.isActive, true)];

if (difficulty.length > 0) {
  whereConditions.push(eq(patients.difficulty, difficulty[0]!));
}

if (searchQuery.trim()) {
  whereConditions.push(like(patients.name, `%${searchQuery}%`));
}

const patientsData = await ctx.db.query.patients.findMany({
  where: and(...whereConditions),
  orderBy: [asc(patients.difficulty), asc(patients.name)],
  limit,
  offset,
});
```

### Data Transformation

```typescript
// Transform database results to application types
const transformedPatients: Patient[] = patientsData.map((patient) => ({
  id: patient.id,
  name: patient.name,
  objectives: JSON.parse(patient.objectives) as string[],
  difficulty: patient.difficulty as DifficultyLevel,
  avatarType: patient.avatarType as "photo" | "illustration" | "avatar",
  createdAt: patient.createdAt,
  updatedAt: patient.updatedAt,
}));
```

### Migration Patterns

```typescript
// Use Drizzle Kit for migrations
// npm run db:generate - Generate migration files
// npm run db:migrate - Apply migrations
// npm run db:push - Push schema changes (development only)
```

## API Design Patterns

### tRPC Router Structure

```typescript
// Router definition pattern
export const patientsRouter = createTRPCRouter({
  // Public procedures for general access
  getExplorationPatients: publicProcedure
    .input(z.object({
      difficulty: z.array(z.number().min(1).max(3)).optional(),
      searchQuery: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Implementation
    }),

  // Protected procedures for authenticated users
  createPatient: protectedProcedure
    .input(createPatientSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (ctx.session.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Implementation
    }),
});
```

### Input Validation

```typescript
// Use Zod for comprehensive input validation
const updatePatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  difficulty: z.number().min(1).max(3).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 1, // At least one field besides id
  { message: "At least one field must be provided for update" }
);
```

### Error Handling in APIs

```typescript
// Use tRPC error codes consistently
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Patient not found",
});

throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid patient data provided",
});

throw new TRPCError({
  code: "FORBIDDEN",
  message: "Admin access required to perform this action",
});
```

### Response Patterns

```typescript
// Consistent response structures
return {
  data: transformedPatients,
  meta: {
    total: totalCount,
    page: Math.floor(offset / limit) + 1,
    hasMore: offset + limit < totalCount,
  },
};

// Success responses for mutations
return {
  id: newPatient?.id,
  success: true,
  message: "Patient created successfully",
};
```

## Error Handling

### Client-Side Error Handling

```typescript
// Use error boundaries for component errors
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryComponent
      fallback={({ error, resetErrorBoundary }) => (
        <div className="p-4 border border-red-500 rounded-md">
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={resetErrorBoundary}>Try again</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}

// Handle tRPC errors gracefully
const { data, error, isLoading } = api.patients.getPatientById.useQuery(
  { id: patientId },
  {
    onError: (error) => {
      if (error.data?.code === "NOT_FOUND") {
        toast.error("Patient not found");
        router.push("/explore-patients");
      } else {
        toast.error("Failed to load patient data");
      }
    },
  }
);
```

### Server-Side Error Handling

```typescript
// Comprehensive error handling in tRPC procedures
.mutation(async ({ ctx, input }) => {
  try {
    // Validate permissions
    if (ctx.session.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required to perform this action",
      });
    }

    // Perform operation
    const result = await ctx.db.insert(patients).values(input);
    
    return { success: true, id: result.insertId };
  } catch (error) {
    // Log error for debugging
    console.error("Failed to create patient:", error);
    
    // Re-throw tRPC errors
    if (error instanceof TRPCError) {
      throw error;
    }
    
    // Convert database errors
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Patient with this name already exists",
      });
    }
    
    // Generic error fallback
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create patient",
    });
  }
})
```

### Form Validation Errors

```typescript
// Handle form validation with proper error display
const form = useForm({
  resolver: zodResolver(patientSchema),
  defaultValues: {
    name: "",
    difficulty: 1,
  },
});

const onSubmit = async (data: PatientFormData) => {
  try {
    await createPatient.mutateAsync(data);
    toast.success("Patient created successfully");
    router.push("/admin/patients");
  } catch (error) {
    if (error instanceof TRPCError) {
      toast.error(error.message);
    } else {
      toast.error("An unexpected error occurred");
    }
  }
};
```

## Accessibility Guidelines

### Semantic HTML

```typescript
// Use semantic HTML elements
<main role="main" aria-label="Patient exploration">
  <section aria-labelledby="patients-heading">
    <h1 id="patients-heading">Virtual Patients</h1>
    <ul role="list" aria-label="Available patients">
      {patients.map((patient) => (
        <li key={patient.id} role="listitem">
          <PatientCard patient={patient} />
        </li>
      ))}
    </ul>
  </section>
</main>
```

### ARIA Attributes

```typescript
// Proper ARIA labeling
<Card
  role="listitem"
  itemScope
  itemType="https://schema.org/Person"
  aria-label={`Patient: ${patient.name}`}
>
  <CardHeader>
    <CardTitle
      id={`patient-${patient.id}-title`}
      itemProp="name"
    >
      {patient.name}
    </CardTitle>
  </CardHeader>
  
  <div
    className="difficulty-indicator"
    aria-label={getDifficultyAccessibleText(patient.difficulty)}
    role="img"
  >
    {getDifficultyIcon(patient.difficulty)}
  </div>
</Card>
```

### Keyboard Navigation

```typescript
// Ensure keyboard accessibility
<Button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label={`Start simulation with ${patient.name}`}
>
  Continue with {patient.name}
</Button>
```

### Focus Management

```typescript
// Manage focus for modals and dynamic content
const dialogRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isOpen && dialogRef.current) {
    dialogRef.current.focus();
  }
}, [isOpen]);

// Skip links for screen readers
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

### Color and Contrast

```css
/* Ensure sufficient contrast ratios */
.button-primary {
  background-color: var(--color-primary-green); /* 4.5:1 contrast ratio */
  color: var(--color-text-primary);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .patient-card {
    border: 2px solid currentColor;
    background: Canvas;
    color: CanvasText;
  }
}
```

## Performance & Optimization

### Code Splitting

```typescript
// Dynamic imports for route-based code splitting
const AdminDashboard = dynamic(() => import("~/components/features/admin/AdminDashboard"), {
  loading: () => <DashboardSkeleton />,
  ssr: false, // Only if component requires client-side only features
});

// Component-level code splitting
const PatientDetailModal = dynamic(() => 
  import("~/components/features/patients/PatientDetailModal").then(mod => ({ 
    default: mod.PatientDetailModal 
  })), 
  { loading: () => <ModalSkeleton /> }
);
```

### Image Optimization

```typescript
// Use Next.js Image component with optimization
import Image from "next/image";

<Image
  src={patient.avatarUrl || "/images/patients/default.webp"}
  alt={`${patient.name} avatar`}
  width={120}
  height={120}
  className="rounded-full object-cover"
  priority={index < 3} // Prioritize above-the-fold images
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..." // Low-quality placeholder
/>
```

### Database Query Optimization

```typescript
// Use proper indexing and query optimization
const patientsData = await ctx.db.query.patients.findMany({
  where: and(...whereConditions),
  orderBy: [asc(patients.difficulty), asc(patients.name)], // Matches index
  limit: Math.min(limit, 50), // Cap limit to prevent large queries
  offset,
  with: {
    // Only include relations when needed
    therapySessions: {
      where: eq(therapySessions.userId, ctx.session.user.id),
      limit: 1, // Just check if any sessions exist
    },
  },
});
```

### Caching Strategies

```typescript
// Use tRPC caching for frequently accessed data
const { data: patients } = api.patients.getExplorationPatients.useQuery(
  { difficulty: [], searchQuery: "" },
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  }
);

// Use React.memo for expensive components
export const PatientCard = React.memo(function PatientCard({ patient }: PatientCardProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.patient.id === nextProps.patient.id &&
         prevProps.patient.updatedAt === nextProps.patient.updatedAt;
});
```

### Bundle Analysis

```typescript
// Use webpack-bundle-analyzer in development
// npm run build:analyze

// Minimize bundle size with proper imports
// Good - tree-shakeable imports
import { eq, and, like } from "drizzle-orm";
import { Button } from "~/components/ui/button";

// Avoid - imports entire library
import * as drizzle from "drizzle-orm"; // ❌
import * as ui from "~/components/ui"; // ❌
```

## Testing Patterns

### Component Testing

```typescript
// Use React Testing Library patterns
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PatientCard } from "~/components/features/patients/PatientCard";
import { mockPatient } from "~/test/mocks/patients";

describe("PatientCard", () => {
  it("renders patient information correctly", () => {
    render(<PatientCard patient={mockPatient} />);
    
    expect(screen.getByText(mockPatient.name)).toBeInTheDocument();
    expect(screen.getByText(`${mockPatient.estimatedDuration} min`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with/i })).toBeInTheDocument();
  });

  it("handles click events properly", async () => {
    const onClickMock = jest.fn();
    render(<PatientCard patient={mockPatient} onClick={onClickMock} />);
    
    fireEvent.click(screen.getByRole("button", { name: /continue with/i }));
    
    await waitFor(() => {
      expect(onClickMock).toHaveBeenCalledWith(mockPatient.id);
    });
  });
});
```

### API Testing

```typescript
// Test tRPC procedures
import { createCallerFactory } from "~/server/api/trpc";
import { patientsRouter } from "~/server/api/routers/patients";
import { mockSession, mockDb } from "~/test/mocks";

const createCaller = createCallerFactory(patientsRouter);

describe("patientsRouter", () => {
  it("returns active patients for exploration", async () => {
    const caller = createCaller({
      db: mockDb,
      session: mockSession,
    });

    const result = await caller.getExplorationPatients();
    
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      difficulty: expect.any(Number),
    });
  });
});
```

### Integration Testing

```typescript
// Test full user flows
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TRPCReactProvider } from "~/trpc/react";
import { PatientExplorationPage } from "~/app/explore-patients/page";

describe("Patient Exploration Flow", () => {
  it("allows users to filter and select patients", async () => {
    render(
      <TRPCReactProvider>
        <PatientExplorationPage />
      </TRPCReactProvider>
    );

    // Wait for patients to load
    await waitFor(() => {
      expect(screen.getByText("Virtual Patients")).toBeInTheDocument();
    });

    // Filter by difficulty
    fireEvent.click(screen.getByLabelText("Easy difficulty"));
    
    // Verify filtered results
    await waitFor(() => {
      const patientCards = screen.getAllByRole("listitem");
      expect(patientCards.length).toBeGreaterThan(0);
    });
  });
});
```

## Import Management

### Import Order

Follow this consistent import order:

```typescript
// 1. React and Next.js imports
import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 2. External library imports
import { useSession } from "next-auth/react";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// 3. Internal imports (utilities, hooks, types)
import { cn } from "~/lib/utils";
import { useMediaQuery } from "~/hooks/useMediaQuery";
import { type Patient } from "~/types";

// 4. Component imports (UI first, then features)
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { PatientAvatar } from "~/components/features/patients/PatientAvatar";

// 5. API/Server imports
import { api } from "~/trpc/react";
```

### Path Aliases Usage

```typescript
// Use path aliases consistently
import { Button } from "~/components/ui/button"; // ✅
import { cn } from "~/lib/utils"; // ✅
import { type Patient } from "~/types"; // ✅

// Avoid relative imports for common paths
import { Button } from "../../../components/ui/button"; // ❌
import { cn } from "../../lib/utils"; // ❌
```

### Type-Only Imports

```typescript
// Use type-only imports for TypeScript types
import { type NextPage } from "next";
import { type Session } from "next-auth";
import { type Patient } from "~/types";

// Regular imports for runtime values
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
```

### Barrel Exports

```typescript
// Create index.ts files for clean imports
// src/components/ui/index.ts
export { Button } from "./button";
export { Card, CardContent, CardHeader, CardTitle } from "./card";
export { Input } from "./input";

// Usage
import { Button, Card, Input } from "~/components/ui";
```

## Comments & Documentation

### JSDoc Comments

All components and functions should have comprehensive JSDoc comments:

```typescript
/**
 * PatientCard Component
 *
 * Displays patient information in a card format with enhanced styling and accessibility.
 * Shows patient demographics, psychological profile, difficulty level, and estimated duration.
 *
 * Features:
 * - Patient avatar display
 * - Difficulty level indicators with accessibility labels
 * - Patient tags for categorization
 * - Estimated session duration
 * - Link to patient detail page
 *
 * @param patient - Patient object containing all patient information
 * @param className - Additional CSS classes to apply
 * @param onClick - Optional click handler for the card
 * @returns JSX element representing a patient card
 *
 * @example
 * ```tsx
 * <PatientCard 
 *   patient={patientData} 
 *   onClick={(id) => router.push(`/patients/${id}`)}
 * />
 * ```
 */
export function PatientCard({ patient, className, onClick }: PatientCardProps) {
  // Implementation
}
```

### Inline Comments

Use inline comments to explain complex logic:

```typescript
// Session validation with comprehensive checks
const isAuthenticated = useCallback(() => {
  return !!(
    session?.user?.id &&        // User must have an ID
    session?.user?.email &&     // User must have an email
    status === "authenticated"  // Session must be authenticated
  );
}, [session, status]);

// Transform database results to application types
// Parse JSON fields and ensure type safety
const transformedPatients: Patient[] = patientsData.map((patient) => {
  let objectives: string[] = [];
  try {
    objectives = JSON.parse(patient.objectives) as string[];
  } catch (error) {
    console.error("Failed to parse patient objectives:", error);
    objectives = []; // Fallback to empty array
  }
  
  return {
    id: patient.id,
    name: patient.name,
    objectives,
    // ... other fields
  };
});
```

### Code Section Comments

Use section comments to organize large files:

```typescript
// ===== COMPONENT PROPS AND TYPES =====

interface PatientCardProps {
  patient: Patient;
  className?: string;
  onClick?: (patientId: string) => void;
}

// ===== UTILITY FUNCTIONS =====

const getDifficultyIcon = (difficulty: number) => {
  switch (difficulty) {
    case 1: return "•";
    case 2: return "••";
    case 3: return "•••";
    default: return "•";
  }
};

// ===== MAIN COMPONENT =====

export function PatientCard({ patient, className, onClick }: PatientCardProps) {
  // Component implementation
}
```

### TODO and FIXME Comments

Use structured comments for future improvements:

```typescript
// TODO: Implement patient filtering by tags
// Priority: Medium
// Assignee: Development team
// Related: Issue #123

// FIXME: Handle edge case where patient.details is invalid JSON
// This causes the component to crash in production
// Need to add proper error boundaries and fallback UI

// NOTE: This is a temporary workaround for the API limitation
// Remove when backend supports native pagination
const paginatedResults = results.slice(offset, offset + limit);
```

### API Documentation

Document API endpoints thoroughly:

```typescript
/**
 * Get all active virtual patients for exploration page
 *
 * Public endpoint that returns paginated list of patients with optional filtering.
 * Supports filtering by difficulty level and search queries.
 *
 * @param input - Optional filtering and pagination parameters
 * @param input.difficulty - Array of difficulty levels (1-3) to filter by
 * @param input.searchQuery - Search term to match against patient names
 * @param input.limit - Maximum number of results to return (1-50, default: 20)
 * @param input.offset - Number of results to skip for pagination (default: 0)
 * 
 * @returns Array of patient objects with parsed objectives and transformed types
 * 
 * @throws {TRPCError} NOT_FOUND - When no patients match the criteria
 * @throws {TRPCError} BAD_REQUEST - When input validation fails
 * 
 * @example
 * ```typescript
 * const patients = await api.patients.getExplorationPatients.query({
 *   difficulty: [1, 2],
 *   searchQuery: "anxiety",
 *   limit: 10,
 *   offset: 0,
 * });
 * ```
 */
getExplorationPatients: publicProcedure
  .input(/* schema */)
  .query(async ({ ctx, input }) => {
    // Implementation
  }),
```

---

## Final Notes

## Environment & Configuration

### Environment Variables

The project uses `@t3-oss/env-nextjs` for type-safe environment variable validation:

```typescript
// src/env.js
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET: z.string().min(32),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

### Configuration Files

**Next.js Configuration (next.config.js)**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable Turbopack for faster development builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    domains: ['localhost'],
  },
  
  // Enable static exports for specific routes
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

**Drizzle Configuration (drizzle.config.ts)**
```typescript
import { type Config } from "drizzle-kit";
import { env } from "~/env.js";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: ["epatients_*"],
  out: "./drizzle",
} satisfies Config;
```

## Deployment & Production

### Build Process

```json
{
  "scripts": {
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "start": "next start",
    "preview": "next build && next start",
    "check": "next lint && tsc --noEmit"
  }
}
```

### Performance Optimization

1. **Bundle Analysis**
   ```bash
   npm run build:analyze
   ```

2. **Database Optimization**
   ```typescript
   // Use proper indexes for frequent queries
   export const patients = createTable("patient", {
     // ... columns
   }, (table) => ({
     // Index for search functionality
     nameIdx: index("patient_name_idx").on(table.name),
     // Index for filtering
     difficultyIdx: index("patient_difficulty_idx").on(table.difficulty),
     // Composite index for common query patterns
     activeDifficultyIdx: index("patient_active_difficulty_idx")
       .on(table.isActive, table.difficulty),
   }));
   ```

3. **Image Optimization**
   ```typescript
   // Use Next.js Image component with proper sizing
   <Image
     src={patient.avatarUrl}
     alt={`${patient.name} avatar`}
     width={120}
     height={120}
     className="rounded-full"
     priority={index < 3} // Prioritize above-the-fold images
     placeholder="blur"
     blurDataURL="data:image/jpeg;base64,..."
   />
   ```

### Security Considerations

1. **Content Security Policy**
   ```typescript
   // middleware.ts - Add CSP headers
   const cspHeader = `
     default-src 'self';
     script-src 'self' 'unsafe-eval' 'unsafe-inline';
     style-src 'self' 'unsafe-inline';
     img-src 'self' blob: data:;
     font-src 'self';
     object-src 'none';
     base-uri 'self';
     form-action 'self';
     frame-ancestors 'none';
   `;
   ```

2. **Rate Limiting**
   ```typescript
   // Implement rate limiting for API routes
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";

   const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(10, "10 s"),
   });
   ```

### Language Requirements
- All comments must be written in English (as per user requirements: "I commenti devono essere sempre in inglese")
- Use clear, professional English in documentation
- Maintain consistency in terminology throughout the codebase

### Code Quality Checklist

Before submitting code, ensure:

- [ ] TypeScript strict mode compliance
- [ ] ESLint rules passing
- [ ] Prettier formatting applied
- [ ] All imports properly organized
- [ ] Components have proper JSDoc documentation
- [ ] Error handling is comprehensive
- [ ] Accessibility attributes are included
- [ ] Performance optimizations are considered
- [ ] Security best practices are followed
- [ ] Tests are written for critical functionality
- [ ] Environment variables are properly validated
- [ ] Database queries are optimized with proper indexes
- [ ] Images are optimized with Next.js Image component

### Project File Structure Reference

```
epatients/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── (auth)/            # Route groups for organization
│   │   ├── dashboard/         # Protected dashboard routes
│   │   ├── admin/             # Admin-only routes
│   │   ├── api/               # API routes (NextAuth, tRPC)
│   │   └── globals.css        # Global styles with Tailwind v4
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── common/            # Shared application components
│   │   ├── features/          # Feature-specific components
│   │   ├── layout/            # Layout components
│   │   └── navigation/        # Navigation components
│   ├── server/
│   │   ├── api/               # tRPC routers and procedures
│   │   ├── auth/              # NextAuth v5 configuration
│   │   └── db/                # Drizzle ORM schema and utilities
│   ├── lib/                   # Utility functions and constants
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript type definitions
│   └── env.js                 # Environment validation
├── drizzle/                   # Database migrations
├── public/                    # Static assets
├── scripts/                   # Utility scripts (seed, diagnostics)
├── package.json               # Dependencies and scripts
├── tailwind.config.ts         # Tailwind CSS v4 configuration
├── drizzle.config.ts         # Drizzle ORM configuration
├── components.json           # shadcn/ui configuration
└── middleware.ts             # Next.js middleware for auth
```

### Continuous Improvement

This document should be updated as:
- New patterns emerge in the codebase
- Dependencies are upgraded (Next.js, React, Tailwind, etc.)
- New features require specific guidelines
- Package documentation is updated
- Team feedback identifies areas for improvement
- Performance optimizations are discovered
- Security best practices evolve

Remember: These guidelines exist to maintain code quality, consistency, and developer productivity. When in doubt, favor readability, maintainability, and user experience. Always refer to the official documentation of each package for the latest features and best practices.
