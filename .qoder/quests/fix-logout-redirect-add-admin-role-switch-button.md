# Fix Logout Redirect and Add Admin Role Switch Button

## Overview

This design addresses several interconnected issues in the ePatient Next.js application's authentication and navigation system:

1. **Logout Redirect Issue**: Currently logout redirects to `localhost:3001` and doesn't properly log users out
2. **Admin Role Switching**: Add functionality for admins to switch between admin and user role views
3. **Unified Navigation**: Implement the same navbar for both homepage and dashboard
4. **Consistent Styling**: Ensure dashboard uses fonts and colors from SharedLayout

## Architecture

### Current State Analysis

The application currently has two separate layout systems:
- `DashboardLayout.tsx` for dashboard pages
- `SharedLayout.tsx` for home pages and advanced functionality

The logout functionality is implemented differently across components:
- `AuthButton.tsx` uses `signOut({ callbackUrl: '/' })`
- Dashboard layouts use direct links to `/api/auth/signout`

```mermaid
flowchart TD
    A[Homepage] --> B[SharedLayout]
    C[Dashboard] --> D[DashboardLayout]
    B --> E[AuthButton Component]
    D --> F[Direct Logout Link]
    E --> G[signOut with callbackUrl]
    F --> H[NextAuth Signout API]
    G --> I[Redirect Issue]
    H --> J[Redirect Issue]
```

### Target Architecture

Unified layout system with consistent logout behavior and admin role switching:

```mermaid
flowchart TD
    A[Homepage] --> B[SharedLayout]
    C[Dashboard] --> B
    B --> D[Unified AuthButton]
    B --> E[Admin Role Switch]
    D --> F[Proper Logout Handler]
    E --> G[Role Context Management]
    F --> H[Redirect to Homepage]
    G --> I[Dynamic Navigation]
```

## Component Architecture

### Unified Layout Strategy

Replace the dual layout system with a single `SharedLayout` component that adapts based on page type:

```mermaid
classDiagram
    class SharedLayout {
        +layoutType: "dashboard" | "home"
        +user: User
        +currentPage: string
        +adminViewMode: "admin" | "user"
        +renderHeader()
        +renderSidebar()
        +renderFooter()
        +handleLogout()
        +handleRoleSwitch()
    }
    
    class User {
        +id: string
        +name: string | null
        +email: string
        +role: "admin" | "user"
        +image?: string | null
    }
    
    class AdminRoleSwitch {
        +currentMode: "admin" | "user"
        +onModeChange: Function
        +isAdmin: boolean
    }
    
    SharedLayout --> User
    SharedLayout --> AdminRoleSwitch
```

### Enhanced AuthButton Component

Consolidate authentication logic into a single, reusable component:

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Authenticated: Session exists
    Loading --> Unauthenticated: No session
    
    Authenticated --> LoggingOut: User clicks logout
    LoggingOut --> Unauthenticated: Logout complete
    
    Authenticated --> RoleSwitching: Admin switches role
    RoleSwitching --> Authenticated: Role switched
```

## Role Switching System

### Admin View Mode Management

Implement client-side role switching that doesn't affect server-side permissions:

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant Client as Client State
    participant UI as UI Components
    participant Server as Server Session
    
    Admin->>Client: Click role switch button
    Client->>Client: Update adminViewMode state
    Client->>UI: Re-render navigation items
    UI->>UI: Show user navigation (admin view)
    Note right of Server: Server session unchanged<br/>Security maintained
    Client->>UI: Update role badge display
```

### Navigation Items Logic

Dynamic navigation based on actual role and view mode:

| Actual Role | View Mode | Navigation Items | Role Badge |
|-------------|-----------|------------------|------------|
| admin | admin | Admin navigation | Admin |
| admin | user | User navigation | Admin (User View) |
| user | N/A | User navigation | Utente |

## Logout Fix Implementation

### Root Cause Analysis

Current logout issues stem from:
1. Inconsistent callback URL handling
2. Missing proper session invalidation
3. Redirect configuration problems

### Proper Logout Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Client as Client Component
    participant NextAuth as NextAuth
    participant Server as Server Session
    participant Browser as Browser
    
    User->>Client: Click logout button
    Client->>NextAuth: signOut({ callbackUrl: window.location.origin })
    NextAuth->>Server: Invalidate session
    Server->>NextAuth: Session cleared
    NextAuth->>Browser: Redirect to homepage
    Browser->>Client: Load homepage (unauthenticated)
```

## Implementation Details

### Unified Layout Component Structure

```typescript
interface SharedLayoutProps {
  children: React.ReactNode;
  user: User;
  layoutType: "dashboard" | "home";
  currentPage?: string;
}

interface AdminRoleSwitchState {
  viewMode: "admin" | "user";
  setViewMode: (mode: "admin" | "user") => void;
}
```

### Admin Role Switch Button Design

Visual component specifications:
- **Position**: Header, next to user name and role badge
- **Style**: Toggle button with clear visual indication of current mode
- **Text**: "Switch to User View" / "Switch to Admin View"
- **Icon**: Role-specific icons for clarity
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Logout Button Enhancement

Standardized logout implementation:
- **Method**: Use `signOut()` from next-auth/react consistently
- **Callback**: Dynamic callback URL based on current environment
- **Confirmation**: Optional confirmation dialog for important sessions
- **Loading State**: Visual feedback during logout process

### Style Consistency

Ensure dashboard inherits SharedLayout styling:
- **Font Family**: Merriweather font from globals.css
- **Color Palette**: Primary green colors and semantic colors
- **Typography Scale**: Consistent font sizes and line heights
- **Component Styles**: Reuse button and navigation styles

## Data Flow Integration

### State Management Strategy

```mermaid
graph LR
    A[URL Route] --> B[Page Component]
    B --> C[SharedLayout]
    C --> D[User Session]
    C --> E[Admin View State]
    E --> F[Navigation Items]
    D --> F
    F --> G[UI Rendering]
```

### Session Context Flow

- **Authentication**: NextAuth session provides user data
- **Role Information**: User role determines base permissions
- **View Mode**: Client-side state for admin role switching
- **Navigation**: Dynamic based on role + view mode combination

## Testing Strategy

### Authentication Flow Testing

1. **Login/Logout Cycle**: Verify proper redirect behavior
2. **Session Persistence**: Test session handling across page refreshes
3. **Role-based Access**: Confirm proper route protection
4. **Logout Redirect**: Ensure consistent homepage redirection

### Role Switching Testing

1. **Admin Role Switch**: Test switching between admin/user views
2. **Navigation Updates**: Verify correct menu items display
3. **State Persistence**: Test view mode across page navigation
4. **Non-admin Users**: Confirm switch button doesn't appear

### Layout Consistency Testing

1. **Style Inheritance**: Verify dashboard uses SharedLayout styles
2. **Responsive Design**: Test layout on different screen sizes
3. **Font Loading**: Confirm Merriweather font displays correctly
4. **Color Consistency**: Verify color palette usage across components