# Contributing to ePatient 🤝

Thank you for your interest in contributing to the ePatient platform! This guide will help you understand our development process and how to submit quality contributions.

## 🎯 How to Contribute

### Types of Contributions

We welcome several types of contributions:

- 🐛 **Bug fixes** - Help us squash bugs and improve stability
- ✨ **New features** - Add functionality that enhances the platform
- 📚 **Documentation** - Improve our docs, guides, and examples
- 🧪 **Tests** - Add test coverage and improve quality assurance
- 🎨 **UI/UX improvements** - Enhance user experience and design
- ⚡ **Performance optimizations** - Make the platform faster and more efficient
- 🔧 **Code refactoring** - Improve code quality and maintainability

### Before You Start

1. **Check existing issues** - Look for existing work or discussions
2. **Read the docs** - Familiarize yourself with the [System Overview](system-overview.md)
3. **Set up development environment** - Follow the [Development Guide](development-guide.md)
4. **Understand the codebase** - Review the [API Documentation](api-documentation.md)

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR-USERNAME/epatient.git
cd epatient

# Add upstream remote
git remote add upstream https://github.com/original-org/epatient.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up database
npm run db:push

# Start development server
npm run dev
```

### 3. Create a Branch

```bash
# Always create a new branch for your work
git checkout -b feature/your-feature-name

# Examples:
git checkout -b fix/login-redirect-issue
git checkout -b feature/user-profile-editing
git checkout -b docs/api-documentation-update
```

## 📋 Development Standards

### Code Style Guidelines

#### TypeScript
- **Use TypeScript** for all new code
- **Enable strict mode** - follow strict TypeScript settings
- **Explicit types** - avoid `any`, use proper type definitions
- **Interface over type** - prefer interfaces for object shapes

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

// ❌ Avoid
type UserProfile = {
  id: any;
  name: any;
  email: any;
}
```

#### React Components
- **Functional components** with hooks
- **TypeScript interfaces** for props
- **Descriptive component names** in PascalCase
- **Extract custom hooks** for reusable logic

```typescript
// ✅ Good
interface UserCardProps {
  user: UserProfile;
  onEdit: (userId: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  const handleEdit = () => onEdit(user.id);
  
  return (
    <div className=\"rounded-lg border p-4\">
      <h3 className=\"font-semibold\">{user.name}</h3>
      <p className=\"text-sm text-gray-600\">{user.email}</p>
      <button onClick={handleEdit} className=\"btn btn-primary\">
        Edit
      </button>
    </div>
  );
}
```

#### API Development
- **tRPC procedures** for all API endpoints
- **Zod schemas** for input validation
- **Proper error handling** with meaningful messages
- **Type-safe database queries** using Drizzle ORM

```typescript
// ✅ Good
export const userRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      email: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.db
          .update(users)
          .set(input)
          .where(eq(users.id, ctx.session.user.id))
          .returning();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }
    }),
});
```

#### CSS and Styling
- **Tailwind CSS** for styling
- **Component classes** defined in `styles/components.css`
- **Consistent spacing** using Tailwind scale
- **Responsive design** with mobile-first approach

```css
/* ✅ Good - Component class in styles/components.css */
.btn {
  @apply inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  @apply disabled:pointer-events-none disabled:opacity-50;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
}
```

### Naming Conventions

#### Files and Directories
- **kebab-case** for directories: `user-management/`
- **PascalCase** for React components: `UserProfile.tsx`
- **camelCase** for utilities and hooks: `useUserProfile.ts`
- **lowercase** for pages in app router: `page.tsx`

#### Variables and Functions
- **camelCase** for variables and functions: `userName`, `getUserProfile()`
- **PascalCase** for types and interfaces: `UserProfile`, `ApiResponse`
- **SCREAMING_SNAKE_CASE** for constants: `MAX_FILE_SIZE`

#### Database
- **snake_case** for table and column names: `user_profiles`, `created_at`
- **Descriptive names** for foreign keys: `created_by_user_id`

### Code Organization

#### File Structure
```
src/
├── app/                    # Next.js app router
│   ├── (auth)/            # Route groups
│   ├── api/               # API routes
│   └── dashboard/         # Feature-based routing
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   └── features/         # Feature-specific components
├── server/               # Backend code
│   ├── api/              # tRPC routers
│   ├── auth/             # Authentication
│   └── db/               # Database
├── lib/                  # Utility functions
├── types/                # Type definitions
└── hooks/                # Custom React hooks
```

#### Import Organization
```typescript
// 1. External libraries
import React from 'react';
import { z } from 'zod';
import { NextResponse } from 'next/server';

// 2. Internal utilities and types
import { api } from '~/trpc/react';
import type { UserProfile } from '~/types/user';

// 3. Internal components
import { Button } from '~/components/ui/button';
import { UserCard } from '~/components/features/user-card';

// 4. Relative imports
import './styles.css';
```

## 🧪 Testing Requirements

### Test Coverage
- **Unit tests** for utility functions and hooks
- **Component tests** for React components
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows

### Testing Tools
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing
- **MSW** - API mocking

### Writing Tests

```typescript
// Component test example
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
};

test('renders user information', () => {
  const onEdit = jest.fn();
  render(<UserCard user={mockUser} onEdit={onEdit} />);
  
  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## 📝 Commit Guidelines

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to build process or auxiliary tools

### Scopes
- `auth`: Authentication and authorization
- `api`: API and backend changes
- `ui`: User interface components
- `db`: Database schema and queries
- `config`: Configuration changes
- `deps`: Dependency updates

### Examples

```bash
# Good commit messages
git commit -m \"feat(auth): add Discord OAuth integration\"
git commit -m \"fix(api): resolve user creation validation error\"
git commit -m \"docs(readme): update installation instructions\"
git commit -m \"refactor(ui): extract reusable Button component\"

# With body and footer
git commit -m \"feat(simulation): add patient vital signs tracking

Implement real-time vital signs monitoring during clinical simulations.
Includes heart rate, blood pressure, and respiratory rate tracking.

Closes #123\"
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run quality checks**
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm test
   ```

3. **Test your changes**
   ```bash
   npm run build
   npm run preview
   ```

### PR Template

Use this template for your pull request description:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] E2E tests pass (if applicable)

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or clearly documented)
```

### Review Process

1. **Automatic checks** must pass
2. **Code review** by at least one maintainer
3. **Manual testing** for UI/UX changes
4. **Documentation review** if docs are updated

### Review Criteria

- ✅ **Functionality** - Does it work as intended?
- ✅ **Code quality** - Is it well-written and maintainable?
- ✅ **Performance** - Does it introduce any performance issues?
- ✅ **Security** - Are there any security concerns?
- ✅ **Testing** - Is it adequately tested?
- ✅ **Documentation** - Is it properly documented?

## 🐛 Bug Reports

### Before Reporting

1. **Check existing issues** - Search for similar problems
2. **Try latest version** - Ensure you're using the latest code
3. **Reproduce the issue** - Confirm it's reproducible

### Bug Report Template

```markdown
## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear description of what you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Node.js version: [e.g. 18.17.0]
- npm version: [e.g. 9.6.7]

## Additional Context
Add any other context about the problem here.
```

## 💡 Feature Requests

### Feature Request Template

```markdown
## Feature Description
A clear and concise description of what you want to happen.

## Problem Statement
Describe the problem you're trying to solve.

## Proposed Solution
Describe the solution you'd like.

## Alternatives Considered
Describe any alternative solutions you've considered.

## Additional Context
Add any other context, mockups, or examples about the feature request.

## Impact
Describe who would benefit from this feature and how.
```

## 📚 Documentation Contributions

### Documentation Standards

- **Clear and concise** - Easy to understand
- **Step-by-step** - Include detailed instructions
- **Code examples** - Show practical usage
- **Up-to-date** - Keep in sync with code changes
- **Cross-references** - Link to related documentation

### Types of Documentation

- **API docs** - tRPC endpoint documentation
- **Guides** - How-to guides and tutorials
- **Architecture** - System design and patterns
- **Deployment** - Setup and deployment instructions
- **Contributing** - Development and contribution guides

## 🏆 Recognition

### Contributor Recognition

- **Contributors file** - Listed in CONTRIBUTORS.md
- **GitHub insights** - Visible in repository insights
- **Release notes** - Mentioned in notable contributions
- **Community highlights** - Featured in project updates

### Becoming a Maintainer

Regular contributors who demonstrate:
- **Consistent quality** contributions
- **Good understanding** of the codebase
- **Helpful community** participation
- **Alignment** with project values

May be invited to become maintainers with additional privileges:
- **Merge permissions** for pull requests
- **Issue triage** responsibilities
- **Release management** participation
- **Community moderation** duties

## 📞 Getting Help

### Resources

- **Documentation** - Check the [wiki](README.md)
- **GitHub Issues** - Search existing issues
- **Discord/Slack** - Join our community chat
- **Stack Overflow** - Use the `epatient` tag

### Communication Guidelines

- **Be respectful** and professional
- **Provide context** and detailed information
- **Use proper formatting** for code and logs
- **Follow up** on responses and suggestions

## 🎉 Thank You

Thank you for contributing to the ePatient platform! Your contributions help make medical education more accessible and effective for learners worldwide.

Every contribution, no matter how small, makes a difference. Whether it's fixing a typo, reporting a bug, or implementing a major feature, we appreciate your effort and dedication to improving the platform.

---

**Questions?** Feel free to reach out to the maintainers or create an issue for clarification.

**Happy contributing! 🚀**"