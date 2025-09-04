# Development Guide 👨‍💻

## Getting Started

This guide will help you set up a complete development environment for the ePatient platform and understand the development workflow.

## Prerequisites

### Required Software

- **Node.js** 18.x or later ([Download](https://nodejs.org/))
- **npm** 9.x or later (included with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **VS Code** (recommended) or your preferred code editor

### Recommended VS Code Extensions

```json
{
  \"recommendations\": [
    \"bradlc.vscode-tailwindcss\",
    \"esbenp.prettier-vscode\",
    \"ms-vscode.vscode-typescript-next\",
    \"dbaeumer.vscode-eslint\",
    \"formulahendry.auto-rename-tag\",
    \"ms-vscode.vscode-json\",
    \"redhat.vscode-yaml\",
    \"ms-playwright.playwright\"
  ]
}
```

### Accounts and Access

- **Discord Developer Account** - For OAuth integration
- **Google Cloud Platform Account** - For production deployment (optional for local dev)
- **GitHub Account** - For repository access

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/epatient.git
cd epatient
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

#### Create Environment File

```bash
cp .env.example .env.local
```

#### Configure Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to OAuth2 settings
4. Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
5. Copy Client ID and Client Secret to `.env.local`

#### Generate Secrets

```bash
# Generate AUTH_SECRET (32+ characters)
openssl rand -base64 32

# Or use Node.js
node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"
```

#### Complete .env.local Configuration

```env
# Database
DATABASE_URL=\"file:./dev.db\"

# Authentication (replace with your generated values)
AUTH_SECRET=\"your-generated-32-character-secret\"
NEXTAUTH_SECRET=\"your-generated-32-character-secret\"
JWT_SECRET=\"your-generated-32-character-secret\"

# Discord OAuth (replace with your Discord app credentials)
AUTH_DISCORD_ID=\"your-discord-client-id\"
AUTH_DISCORD_SECRET=\"your-discord-client-secret\"

# Environment
NODE_ENV=\"development\"
```

### 4. Database Setup

```bash
# Generate database schema
npm run db:generate

# Push schema to local SQLite database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

**🎉 Success!** Your application should now be running at [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Daily Development Process

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   npm install  # In case of new dependencies
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Make Changes and Test**
   ```bash
   # Run type checking
   npm run typecheck
   
   # Run linting
   npm run lint
   
   # Run tests (when available)
   npm test
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m \"feat: add user profile editing feature\"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request via GitHub UI
   ```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m \"feat(auth): add Discord OAuth integration\"
git commit -m \"fix(database): resolve user creation duplicate key issue\"
git commit -m \"docs(api): update tRPC endpoint documentation\"
```

## Project Structure

```
epatient/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── _components/     # Shared components
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── login/          # Authentication pages
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Reusable components
│   │   ├── ui/            # UI components
│   │   └── layout/        # Layout components
│   ├── server/            # Backend code
│   │   ├── api/           # tRPC routers
│   │   ├── auth/          # Authentication config
│   │   └── db/            # Database schema and config
│   ├── styles/            # CSS files
│   ├── trpc/              # tRPC client configuration
│   └── env.js             # Environment validation
├── drizzle/               # Database migrations
├── scripts/               # Utility scripts
├── wiki/                  # Project documentation
└── package.json           # Dependencies and scripts
```

## Key Development Tools

### Database Management

#### Drizzle Studio
Visual database explorer:

```bash
npm run db:studio
```

Opens at [http://localhost:4983](http://localhost:4983)

#### Database Operations

```bash
# Generate new migration
npm run db:generate

# Apply migrations
npm run db:push

# Reset database (caution: deletes all data)
rm dev.db
npm run db:push
```

### Code Quality Tools

#### TypeScript

```bash
# Check types without emitting files
npm run typecheck

# Watch mode
npx tsc --noEmit --watch
```

#### ESLint

```bash
# Check for linting issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

#### Prettier

```bash
# Check formatting
npm run format:check

# Format all files
npm run format:write
```

### Build and Preview

```bash
# Build for production
npm run build

# Start production server
npm run start

# Build and preview
npm run preview
```

## Adding New Features

### Creating a New Page

1. **Create page file in app directory:**
   ```typescript
   // src/app/my-feature/page.tsx
   export default function MyFeaturePage() {
     return (
       <div>
         <h1>My New Feature</h1>
       </div>
     );
   }
   ```

2. **Add navigation link:**
   ```typescript
   // Update navigation component
   <Link href=\"/my-feature\">My Feature</Link>
   ```

### Creating API Endpoints

1. **Create tRPC router:**
   ```typescript
   // src/server/api/routers/my-feature.ts
   import { z } from \"zod\";
   import { createTRPCRouter, protectedProcedure } from \"~/server/api/trpc\";
   
   export const myFeatureRouter = createTRPCRouter({
     getAll: protectedProcedure.query(async ({ ctx }) => {
       // Implementation
     }),
     
     create: protectedProcedure
       .input(z.object({ name: z.string() }))
       .mutation(async ({ input, ctx }) => {
         // Implementation
       }),
   });
   ```

2. **Add to root router:**
   ```typescript
   // src/server/api/root.ts
   import { myFeatureRouter } from \"~/server/api/routers/my-feature\";
   
   export const appRouter = createTRPCRouter({
     // ... existing routers
     myFeature: myFeatureRouter,
   });
   ```

3. **Use in frontend:**
   ```typescript
   // src/app/my-feature/page.tsx
   import { api } from \"~/trpc/react\";
   
   export default function MyFeaturePage() {
     const { data, isLoading } = api.myFeature.getAll.useQuery();
     
     // Component implementation
   }
   ```

### Database Schema Changes

1. **Update schema:**
   ```typescript
   // src/server/db/schema.ts
   export const myTable = createTable(\"my_table\", {
     id: text(\"id\", { length: 255 }).notNull().primaryKey(),
     name: text(\"name\", { length: 255 }).notNull(),
     createdAt: integer(\"created_at\", { mode: \"timestamp\" })
       .default(sql`(unixepoch())`)
       .notNull(),
   });
   ```

2. **Generate migration:**
   ```bash
   npm run db:generate
   ```

3. **Apply migration:**
   ```bash
   npm run db:push
   ```

### Adding UI Components

1. **Create component:**
   ```typescript
   // src/components/ui/my-component.tsx
   interface MyComponentProps {
     title: string;
     children: React.ReactNode;
   }
   
   export function MyComponent({ title, children }: MyComponentProps) {
     return (
       <div className=\"rounded-lg border p-4\">
         <h2 className=\"text-lg font-semibold\">{title}</h2>
         {children}
       </div>
     );
   }
   ```

2. **Export from index:**
   ```typescript
   // src/components/ui/index.ts
   export { MyComponent } from \"./my-component\";
   ```

3. **Use in pages:**
   ```typescript
   import { MyComponent } from \"~/components/ui\";
   
   <MyComponent title=\"Hello\">
     <p>Content here</p>
   </MyComponent>
   ```

## Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  \"version\": \"0.2.0\",
  \"configurations\": [
    {
      \"name\": \"Next.js: debug server-side\",
      \"type\": \"node-terminal\",
      \"request\": \"launch\",
      \"command\": \"npm run dev\"
    },
    {
      \"name\": \"Next.js: debug client-side\",
      \"type\": \"chrome\",
      \"request\": \"launch\",
      \"url\": \"http://localhost:3001\"
    }
  ]
}
```

### Common Debug Techniques

1. **Server-side debugging:**
   ```typescript
   console.log('Debug info:', { variable });
   debugger; // VS Code will break here
   ```

2. **Client-side debugging:**
   ```typescript
   console.log('Client debug:', data);
   // Use browser dev tools
   ```

3. **tRPC debugging:**
   ```typescript
   // Enable in development
   const api = createTRPCReact<AppRouter>({
     links: [
       loggerLink({
         enabled: () => process.env.NODE_ENV === 'development',
       }),
       // ... other links
     ],
   });
   ```

### Database Debugging

1. **View database content:**
   ```bash
   npm run db:studio
   ```

2. **Raw SQL queries:**
   ```bash
   sqlite3 dev.db
   .tables
   SELECT * FROM users;
   ```

3. **Drizzle query logging:**
   ```typescript
   // In development
   const db = drizzle(connection, {
     schema,
     logger: process.env.NODE_ENV === 'development',
   });
   ```

## Testing

### Setup Testing Framework (Future)

When tests are added, they will use:

- **Jest** - Testing framework
- **Testing Library** - React component testing
- **Playwright** - E2E testing
- **MSW** - API mocking

### Test Structure

```
tests/
├── unit/          # Unit tests
├── integration/   # Integration tests
├── e2e/          # End-to-end tests
└── __mocks__/    # Test mocks
```

## Performance Optimization

### Development Performance

1. **Use Turbo mode:**
   ```bash
   npm run dev  # Already includes --turbo
   ```

2. **TypeScript optimization:**
   ```bash
   # Use project references for faster builds
   npm run typecheck
   ```

3. **Selective compilation:**
   ```bash
   # Only build changed files
   npx next dev --experimental-https
   ```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

## Deployment Testing

### Local Production Build

```bash
# Test production build locally
npm run build
npm run start
```

### Docker Testing

```bash
# Build Docker image
docker build -t epatient .

# Run container
docker run -p 3001:3001 epatient
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   lsof -ti:3001 | xargs kill -9
   # Or use different port
   npm run dev -- --port 3002
   ```

2. **Database locked:**
   ```bash
   rm dev.db
   npm run db:push
   ```

3. **Module resolution issues:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **TypeScript errors:**
   ```bash
   rm -rf .next
   npm run dev
   ```

5. **Authentication issues:**
   - Check Discord OAuth redirect URI
   - Verify environment variables
   - Clear browser cookies

### Getting Help

1. **Check existing issues** on GitHub
2. **Search the wiki** for solutions
3. **Ask in team chat** or Discord
4. **Create detailed issue** with reproduction steps

## Next Steps

- Read [Code Standards](code-standards.md) for style guidelines
- Explore [API Documentation](api-documentation.md) for backend development
- Check [System Overview](system-overview.md) for architecture understanding
- Review [Deployment Guide](deployment-guide.md) for production deployment

---

**Happy coding! 🚀**"