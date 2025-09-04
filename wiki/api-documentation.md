# API Documentation 📡

## Overview

The ePatient platform uses [tRPC](https://trpc.io) to provide end-to-end type-safe APIs. This document covers all available API endpoints, their inputs, outputs, and usage examples.

## Base Configuration

### API Base URL
- **Development**: `http://localhost:3001/api/trpc`
- **Production**: `https://your-domain.com/api/trpc`

### Authentication
All protected endpoints require a valid session. Authentication is handled automatically by the tRPC client when used in the frontend.

```typescript
// Example authenticated request
const result = await api.user.getProfile.query();
```

## Router Structure

The API is organized into logical routers:

```typescript
api/
├── user/          # User management operations
├── post/          # Post/content operations  
├── dashboard/     # Dashboard data
├── impersonation/ # Admin impersonation
└── userManagement/ # Admin user management
```

## User Router (`api.user`)

### `getProfile`
Retrieve the current user's profile information.

**Type**: `query`  
**Protection**: `protectedProcedure`  
**Input**: None

```typescript
// Usage
const profile = await api.user.getProfile.query();

// Response Type
type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  emailVerified: Date | null;
}
```

### `updateProfile`
Update the current user's profile information.

**Type**: `mutation`  
**Protection**: `protectedProcedure`  
**Input**: Partial user data

```typescript
// Input Schema
const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  // Additional fields as needed
});

// Usage
const updatedUser = await api.user.updateProfile.mutate({
  name: \"John Doe\"
});
```

## Post Router (`api.post`)

### `hello`
Simple greeting endpoint for testing.

**Type**: `query`  
**Protection**: `publicProcedure`  
**Input**: Text string

```typescript
// Input Schema
const helloSchema = z.object({
  text: z.string()
});

// Usage
const greeting = await api.post.hello.query({ text: \"World\" });

// Response
// { greeting: \"Hello World\" }
```

### `create`
Create a new post.

**Type**: `mutation`  
**Protection**: `protectedProcedure`  
**Input**: Post data

```typescript
// Input Schema
const createPostSchema = z.object({
  name: z.string().min(1)
});

// Usage
await api.post.create.mutate({
  name: \"My new post\"
});

// Response: void (success/error only)
```

### `getLatest`
Retrieve the most recent post by the current user.

**Type**: `query`  
**Protection**: `protectedProcedure`  
**Input**: None

```typescript
// Usage
const latestPost = await api.post.getLatest.query();

// Response Type
type Post = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date | null;
  createdById: string;
}
```

## Dashboard Router (`api.dashboard`)

### `getUserStats`
Get user-specific dashboard statistics.

**Type**: `query`  
**Protection**: `protectedProcedure`  
**Input**: None

```typescript
// Usage
const stats = await api.dashboard.getUserStats.query();

// Response Type
type UserStats = {
  totalPosts: number;
  // Additional metrics as implemented
}
```

### `getAdminStats`
Get admin-level dashboard statistics.

**Type**: `query`  
**Protection**: `adminProcedure`  
**Input**: None

```typescript
// Usage (admin only)
const adminStats = await api.dashboard.getAdminStats.query();

// Response Type
type AdminStats = {
  totalUsers: number;
  totalPosts: number;
  // Additional admin metrics
}
```

## User Management Router (`api.userManagement`)

### `getAllUsers`
Retrieve all users in the system (admin only).

**Type**: `query`  
**Protection**: `adminProcedure`  
**Input**: None

```typescript
// Usage (admin only)
const users = await api.userManagement.getAllUsers.query();

// Response Type
type User[] = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: Date | null;
  image: string | null;
}[]
```

### `updateUserRole`
Update a user's role (admin only).

**Type**: `mutation`  
**Protection**: `adminProcedure`  
**Input**: User ID and new role

```typescript
// Input Schema
const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum([\"user\", \"admin\"])
});

// Usage (admin only)
await api.userManagement.updateUserRole.mutate({
  userId: \"user-123\",
  role: \"admin\"
});
```

### `deleteUser`
Delete a user from the system (admin only).

**Type**: `mutation`  
**Protection**: `adminProcedure`  
**Input**: User ID

```typescript
// Input Schema
const deleteUserSchema = z.object({
  userId: z.string()
});

// Usage (admin only)
await api.userManagement.deleteUser.mutate({
  userId: \"user-123\"
});
```

## Impersonation Router (`api.impersonation`)

### `startImpersonation`
Start impersonating another user (admin only).

**Type**: `mutation`  
**Protection**: `adminProcedure`  
**Input**: Target user ID

```typescript
// Input Schema
const startImpersonationSchema = z.object({
  targetUserId: z.string()
});

// Usage (admin only)
const impersonationSession = await api.impersonation.startImpersonation.mutate({
  targetUserId: \"user-123\"
});
```

### `stopImpersonation`
Stop current impersonation session (admin only).

**Type**: `mutation`  
**Protection**: `adminProcedure`  
**Input**: None

```typescript
// Usage (admin only)
await api.impersonation.stopImpersonation.mutate();
```

## Error Handling

### Error Types

tRPC returns structured errors with the following format:

```typescript
type TRPCError = {
  code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR';
  message: string;
  data?: {
    code: string;
    httpStatus: number;
    path: string;
    stack?: string;
  };
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

### Error Handling Example

```typescript
try {
  const result = await api.user.getProfile.query();
} catch (error) {
  if (error.data?.code === 'UNAUTHORIZED') {
    // Redirect to login
    router.push('/login');
  } else {
    // Handle other errors
    console.error('API Error:', error.message);
  }
}
```

## Type Safety

### Client-Side Usage

The tRPC client provides full type safety:

```typescript
// TypeScript will infer correct types
const api = createTRPCReact<AppRouter>();

// Input validation at compile time
api.post.create.mutate({
  name: \"Valid string\" // ✅ Correct
  // name: 123 // ❌ TypeScript error
});

// Response types are automatically inferred
api.user.getProfile.query().then((user) => {
  // user is fully typed with UserProfile type
  console.log(user.email); // ✅ TypeScript knows this exists
  // console.log(user.invalidField); // ❌ TypeScript error
});
```

### Server-Side Type Safety

```typescript
// Input validation with Zod
export const userRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
    }))
    .mutation(async ({ input, ctx }) => {
      // input is typed based on Zod schema
      const { name } = input; // TypeScript knows name is string
      
      // Database operations are also type-safe
      return await ctx.db.update(users)
        .set({ name })
        .where(eq(users.id, ctx.session.user.id));
    }),
});
```

## Rate Limiting

API endpoints are protected by rate limiting:

- **Public endpoints**: 100 requests per 15 minutes
- **Authenticated endpoints**: 1000 requests per 15 minutes
- **Admin endpoints**: 5000 requests per 15 minutes

## Caching

### Query Caching

React Query automatically caches API responses:

```typescript
// This query will be cached for 5 minutes by default
const { data: profile, isLoading } = api.user.getProfile.useQuery();

// Manual cache invalidation
const utils = api.useUtils();
await utils.user.getProfile.invalidate();
```

### Cache Keys

Cache keys are automatically generated based on the procedure path and input:

```typescript
// Cache key: [\"user\", \"getProfile\"]
api.user.getProfile.useQuery();

// Cache key: [\"post\", \"hello\", { input: { text: \"World\" } }]
api.post.hello.useQuery({ text: \"World\" });
```

## WebSocket Support (Future)

Planned WebSocket support for real-time features:

```typescript
// Future implementation
api.simulation.onStateChange.useSubscription({
  simulationId: \"sim-123\"
}, {
  onData: (update) => {
    // Handle real-time simulation updates
  }
});
```

## Testing APIs

### Unit Testing

```typescript
import { createTRPCMsw } from 'msw-trpc';
import { type AppRouter } from '~/server/api/root';

const trpcMsw = createTRPCMsw<AppRouter>();

// Mock API responses for testing
const handlers = [
  trpcMsw.user.getProfile.query(() => {
    return {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      image: null,
      emailVerified: null,
    };
  }),
];
```

### Integration Testing

```typescript
import { createCallerFactory } from '~/server/api/trpc';
import { db } from '~/server/db';

const createCaller = createCallerFactory(appRouter);

test('user can create post', async () => {
  const caller = createCaller({
    db,
    session: { user: { id: 'user-1', role: 'user' } }
  });
  
  await caller.post.create({ name: 'Test Post' });
  
  const posts = await db.select().from(postsTable);
  expect(posts).toHaveLength(1);
});
```

## Performance Considerations

### Batching

tRPC automatically batches multiple queries:

```typescript
// These will be batched into a single HTTP request
const [profile, stats, posts] = await Promise.all([
  api.user.getProfile.query(),
  api.dashboard.getUserStats.query(),
  api.post.getLatest.query(),
]);
```

### Optimistic Updates

```typescript
const utils = api.useUtils();

const createPost = api.post.create.useMutation({
  onMutate: async (newPost) => {
    // Cancel outgoing refetches
    await utils.post.getLatest.cancel();
    
    // Snapshot previous value
    const previousPost = utils.post.getLatest.getData();
    
    // Optimistically update
    utils.post.getLatest.setData(undefined, newPost);
    
    return { previousPost };
  },
  onError: (err, newPost, context) => {
    // Rollback on error
    utils.post.getLatest.setData(undefined, context?.previousPost);
  },
  onSettled: () => {
    // Refetch after error or success
    utils.post.getLatest.invalidate();
  },
});
```

---

**Next**: Learn about [Database Schema](database-schema.md) or explore [Development Guide](development-guide.md)"