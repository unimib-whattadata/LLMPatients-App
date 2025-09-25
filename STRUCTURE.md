# Project Structure Documentation

This document outlines the optimized file structure for the ePatients Next.js application, following Next.js 15 and React best practices.

## 📁 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route groups for authentication
│   ├── api/                      # API routes
│   ├── dashboard/                # Dashboard pages
│   ├── explore-patients/         # Patient exploration pages
│   ├── admin/                    # Admin pages
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                   # Reusable components
│   ├── ui/                      # Basic UI components
│   │   ├── AuthButton.tsx
│   │   ├── Toast.tsx
│   │   └── index.ts             # Barrel export
│   ├── layout/                  # Layout components
│   │   ├── SharedLayout.tsx
│   │   └── index.ts
│   ├── navigation/              # Navigation components
│   │   ├── Navbar.tsx
│   │   ├── SiteMenu.tsx
│   │   ├── navigationUtils.ts
│   │   └── index.ts
│   ├── features/                # Feature-specific components
│   │   ├── explore-patients/    # Patient exploration feature
│   │   │   ├── PatientCard.tsx
│   │   │   ├── PatientGrid.tsx
│   │   │   └── index.ts
│   │   ├── dashboard/           # Dashboard feature
│   │   │   ├── AdminContent.tsx
│   │   │   ├── UserContent.tsx
│   │   │   └── index.ts
│   │   └── admin/               # Admin feature
│   │       ├── ManageUsersContent.tsx
│   │       └── index.ts
│   └── index.ts                 # Main components barrel export
├── lib/                         # Utility libraries
│   ├── utils/                   # Utility functions
│   │   ├── cn.ts               # Class name utility
│   │   └── index.ts
│   └── index.ts
├── types/                       # TypeScript type definitions
│   └── index.ts
├── hooks/                       # Custom React hooks
├── server/                      # Server-side code
│   ├── api/                     # tRPC API
│   ├── auth/                    # Authentication
│   └── db/                      # Database
└── styles/                      # Global styles
    ├── globals.css
    └── components.css
```

## 🎯 Key Principles

### 1. **Feature-Based Organization**
- Components are organized by feature rather than by type
- Each feature has its own directory with related components
- Barrel exports (`index.ts`) provide clean import paths

### 2. **Separation of Concerns**
- **UI Components**: Basic, reusable UI elements
- **Layout Components**: Page structure and navigation
- **Feature Components**: Business logic specific to features
- **Server Code**: API routes, database, authentication

### 3. **Import Path Aliases**
```typescript
// tsconfig.json
"paths": {
  "~/*": ["./src/*"],
  "@/components/*": ["./src/components/*"],
  "@/lib/*": ["./src/lib/*"],
  "@/types/*": ["./src/types/*"],
  "@/hooks/*": ["./src/hooks/*"]
}
```

### 4. **Barrel Exports**
Each directory has an `index.ts` file that exports all public components:

```typescript
// components/ui/index.ts
export { default as AuthButton } from './AuthButton';
export { Toast } from './Toast';
export { ToastProvider } from './ToastProvider';
```

## 📋 Best Practices

### Component Organization
- **Co-location**: Keep related components together
- **Single Responsibility**: Each component has one clear purpose
- **Reusability**: UI components should be highly reusable
- **Feature Isolation**: Feature components should be self-contained

### Import Strategy
- Use barrel exports for cleaner imports
- Prefer absolute imports with aliases
- Group imports: external libraries, internal modules, relative imports

### File Naming
- **Components**: PascalCase (e.g., `PatientCard.tsx`)
- **Utilities**: camelCase (e.g., `cn.ts`)
- **Types**: PascalCase with `.ts` extension
- **Hooks**: camelCase starting with `use` (e.g., `useAuth.ts`)

### TypeScript
- Centralize type definitions in `/types`
- Use proper type exports and re-exports
- Leverage path aliases for cleaner imports

## 🚀 Benefits

1. **Scalability**: Easy to add new features without cluttering
2. **Maintainability**: Clear separation of concerns
3. **Developer Experience**: Clean imports and clear structure
4. **Performance**: Better tree-shaking and code splitting
5. **Team Collaboration**: Consistent patterns across the codebase

## 🔄 Migration Notes

- All `_components` directories have been moved to `/components/features`
- Import paths updated to use new aliases
- Barrel exports added for cleaner imports
- Type definitions centralized in `/types`

This structure follows Next.js 15 App Router conventions and React best practices for optimal developer experience and maintainability.
