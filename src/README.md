# ePatients - Optimized Project Structure

This document outlines the optimized folder structure for the ePatients Next.js application, following Next.js 15 and React best practices.

## 📁 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route groups for authentication
│   ├── api/                      # API routes
│   ├── dashboard/                 # Dashboard pages
│   ├── explore-patients/         # Patient exploration pages
│   ├── admin/                    # Admin pages
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # Reusable components
│   ├── ui/                      # Basic UI components (shadcn/ui)
│   ├── layout/                  # Layout components
│   ├── navigation/              # Navigation components
│   ├── features/                # Feature-specific components
│   │   ├── admin/               # Admin feature components
│   │   ├── dashboard/           # Dashboard feature components
│   │   ├── explore-patients/    # Patient exploration components
│   │   └── therapeutic-journey/ # Therapy session components
│   └── index.ts                 # Main components barrel export
├── lib/                         # Utility libraries
│   ├── utils/                   # Utility functions
│   ├── constants/               # Application constants
│   └── index.ts                 # Main lib barrel export
├── hooks/                       # Custom React hooks
├── shared/                     # Shared utilities and constants
├── config/                     # Configuration files
├── server/                     # Server-side code
│   ├── api/                    # tRPC API
│   ├── auth/                   # Authentication
│   ├── db/                     # Database
│   └── index.ts                # Server barrel export
├── types/                      # TypeScript type definitions
├── trpc/                       # tRPC client configuration
└── styles/                     # Global styles
    ├── globals.css
    └── components.css
```

## 🎯 Key Improvements

### 1. **Centralized Barrel Exports**
- All directories have `index.ts` files for clean imports
- Consistent export patterns across the codebase
- Better tree-shaking and code splitting

### 2. **Enhanced Path Aliases**
- `@/components/*` - Component imports
- `@/lib/*` - Library utilities
- `@/hooks/*` - Custom hooks
- `@/shared/*` - Shared utilities
- `@/config/*` - Configuration files
- `@/server/*` - Server-side code

### 3. **Feature-Based Organization**
- Components organized by feature rather than by type
- Each feature has its own directory with related components
- Clear separation of concerns

### 4. **Optimized Imports**
- Clean import paths using aliases
- Consistent barrel exports
- Better IDE support and autocomplete

## 🚀 Benefits

1. **Scalability**: Easy to add new features without cluttering
2. **Maintainability**: Clear separation of concerns
3. **Developer Experience**: Clean imports and clear structure
4. **Performance**: Better tree-shaking and code splitting
5. **Team Collaboration**: Consistent patterns across the codebase

## 📝 Usage Examples

```typescript
// Clean component imports
import { Button, Input } from '@/components/ui';
import { PatientCard } from '@/components/features/explore-patients';
import { useAuth } from '@/hooks';

// Clean utility imports
import { cn } from '@/lib/utils';
import { DIFFICULTY_LEVELS } from '@/lib/constants';

// Clean server imports
import { db } from '@/server/db';
import { auth } from '@/server/auth';
```

This structure follows Next.js 15 App Router conventions and React best practices for optimal developer experience and maintainability.
