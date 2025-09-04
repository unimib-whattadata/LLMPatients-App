# ePatient 🏥

**Clinical Simulation Platform for Medical Education**

[![Build Status](https://img.shields.io/badge/build-passing-green)](#)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-yellow)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](#)

ePatient is a comprehensive clinical simulation and learning management system designed to enhance medical education through realistic, interactive patient scenarios. Built on the modern T3 Stack, it provides a type-safe, secure, and scalable platform for medical students and healthcare professionals to practice clinical decision-making in a safe, controlled environment.

## 🎯 Mission

To revolutionize medical education by providing immersive, realistic clinical simulations that bridge the gap between theoretical knowledge and practical application, enabling healthcare professionals to develop critical skills safely and effectively.

## ✨ Key Features

### 🔬 Three-Phase Learning Model

**1. Simulate (Simula)**
- Interactive virtual patient scenarios
- Realistic clinical decision-making environments
- Real-time patient response simulation
- Comprehensive medical history and symptoms

**2. Evaluate (Valuta)**
- Automated assessment system
- Real-time performance tracking
- Detailed feedback on clinical decisions
- Evidence-based scoring algorithms

**3. Learn (Impara)**
- Comprehensive performance reports
- Guided reflection tools
- Progress tracking and analytics
- Personalized learning recommendations

### 🛡️ Security & Access Control
- **Role-based access control** (Admin/User roles)
- **Discord OAuth authentication** integration
- **JWT with database validation** for enhanced security
- **Session management** with NextAuth.js 5

### 🎨 Modern Architecture
- **Type-safe APIs** with tRPC 11
- **React Server Components** with Next.js 15
- **Real-time data synchronization** with React Query
- **Responsive design** with Tailwind CSS
- **Database migrations** with Drizzle ORM

## 🏗️ Technology Stack

### Frontend
- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[React 19](https://react.dev)** - Latest React with Server Components
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[TypeScript](https://typescriptlang.org)** - Type-safe JavaScript

### Backend
- **[tRPC 11](https://trpc.io)** - End-to-end type-safe APIs
- **[NextAuth.js 5](https://next-auth.js.org)** - Authentication with OAuth
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe database access
- **[Zod](https://zod.dev)** - Runtime type validation

### Database & Deployment
- **[LibSQL/SQLite](https://turso.tech)** - Local development database
- **[Google Cloud SQL](https://cloud.google.com/sql)** - Production database (PostgreSQL)
- **[Google Cloud Run](https://cloud.google.com/run)** - Containerized deployment

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later
- **Git** for version control
- **Discord Application** (for OAuth setup)

### One-Command Setup

```bash
git clone https://github.com/your-org/epatient.git
cd epatient
npm install
cp .env.example .env.local
npm run dev
```

**🎉 Your application will be running at [http://localhost:3000](http://localhost:3000)**

> **Note**: You'll need to configure environment variables in `.env.local` before the app functions fully. See the [Local Development Setup](#-local-development-setup) section below.

## 🔧 Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-org/epatient.git
cd epatient
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="file:./dev.db"

# Authentication
AUTH_SECRET="your-32-character-secret-key-here"
NEXTAUTH_SECRET="your-32-character-secret-key-here"
JWT_SECRET="your-32-character-secret-key-here"

# Discord OAuth (Create app at https://discord.com/developers/applications)
AUTH_DISCORD_ID="your-discord-client-id"
AUTH_DISCORD_SECRET="your-discord-client-secret"

# Environment
NODE_ENV="development"
```

### 3. Database Setup

```bash
# Generate database schema
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed

# (Optional) Open database studio
npm run db:studio
```

### 4. Start Development Server

```bash
npm run dev
```

**✅ Verification**: Visit [http://localhost:3000](http://localhost:3000) to see the application running.

### 5. Development Tools

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format:check
npm run format:write

# Build for production
npm run build
```

## ☁️ Google Cloud Platform Deployment

### Prerequisites

- Google Cloud Platform account
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed
- Docker installed locally
- GCP project with billing enabled

### 1. GCP Project Setup

```bash
# Set your project ID
export PROJECT_ID="your-epatient-project-id"

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

### 2. Database Setup (Cloud SQL)

```bash
# Create Cloud SQL instance
gcloud sql instances create epatient-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1

# Create database
gcloud sql databases create epatient --instance=epatient-db

# Create user
gcloud sql users create epatient-user \
    --instance=epatient-db \
    --password=your-secure-password

# Get connection name
gcloud sql instances describe epatient-db --format="value(connectionName)"
```

### 3. Environment Secrets

```bash
# Create secrets in Secret Manager
echo -n "your-auth-secret" | gcloud secrets create auth-secret --data-file=-
echo -n "your-discord-client-id" | gcloud secrets create discord-client-id --data-file=-
echo -n "your-discord-client-secret" | gcloud secrets create discord-client-secret --data-file=-
```

### 4. Build and Deploy

```bash
# Build and submit to Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/epatient

# Deploy to Cloud Run
gcloud run deploy epatient \
    --image gcr.io/$PROJECT_ID/epatient \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --add-cloudsql-instances $PROJECT_ID:us-central1:epatient-db \
    --set-env-vars NODE_ENV=production \
    --set-secrets DATABASE_URL=database-url:latest \
    --set-secrets AUTH_SECRET=auth-secret:latest \
    --set-secrets AUTH_DISCORD_ID=discord-client-id:latest \
    --set-secrets AUTH_DISCORD_SECRET=discord-client-secret:latest
```

### 5. Domain Setup (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
    --service epatient \
    --domain your-domain.com \
    --region us-central1
```

### 6. Database Migration

```bash
# Run migrations on production
export DATABASE_URL="postgresql://epatient-user:password@/epatient?host=/cloudsql/$PROJECT_ID:us-central1:epatient-db"
npm run db:push
```

### Production Environment Variables

For production deployment, ensure these environment variables are configured:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Cloud SQL connection string | `postgresql://user:pass@/db?host=/cloudsql/...` |
| `AUTH_SECRET` | JWT signing secret (32+ chars) | `your-production-secret-key-here` |
| `AUTH_DISCORD_ID` | Discord OAuth client ID | `123456789012345678` |
| `AUTH_DISCORD_SECRET` | Discord OAuth client secret | `your-discord-client-secret` |
| `NODE_ENV` | Environment mode | `production` |

## 🎨 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   tRPC API      │    │   Database      │
│                 │    │                 │    │                 │
│ • Next.js 15    │◄──►│ • Type-safe     │◄──►│ • Drizzle ORM   │
│ • React 19      │    │ • Zod validation│    │ • LibSQL/SQLite │
│ • Tailwind CSS  │    │ • Auth protection│    │ • Cloud SQL     │
│ • React Query   │    │ • Error handling│    │ • Migrations    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                    ┌─────────────────┐
                    │ Authentication  │
                    │                 │
                    │ • NextAuth.js 5 │
                    │ • Discord OAuth │
                    │ • JWT + DB      │
                    │ • Role-based    │
                    └─────────────────┘
```

## 📚 Documentation

- **[Project Wiki](./wiki/README.md)** - Comprehensive project documentation
- **[API Documentation](./wiki/api-documentation.md)** - tRPC API reference
- **[Architecture Guide](./wiki/architecture-overview.md)** - System design and patterns
- **[Development Guide](./wiki/development-guide.md)** - Development workflows and standards
- **[Deployment Guide](./wiki/deployment-guide.md)** - Detailed deployment instructions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./wiki/contributing.md) for details on:

- Code standards and style guide
- Development workflow
- Pull request process
- Testing requirements

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Standards

- **TypeScript** for all code
- **ESLint** and **Prettier** for code formatting
- **Zod** schemas for all data validation
- **tRPC** procedures for all API endpoints
- **Comprehensive testing** for all features

## 🔧 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbo |
| `npm run build` | Build production application |
| `npm run start` | Start production server |
| `npm run preview` | Build and start for preview |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run typecheck` | Run TypeScript compiler |
| `npm run format:check` | Check code formatting |
| `npm run format:write` | Format code with Prettier |
| `npm run db:generate` | Generate database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed database with sample data |

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Reset database
rm -f dev.db
npm run db:push
```

**TypeScript Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

**Authentication Issues**
- Verify Discord OAuth credentials in `.env.local`
- Ensure `AUTH_SECRET` is at least 32 characters
- Check that your Discord app's redirect URI matches your local URL

**Port Already in Use**
```bash
# Use different port
npm run dev -- --port 3001
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the [T3 Stack](https://create.t3.gg/)
- Inspired by modern medical education needs
- Thanks to the open-source community for amazing tools

---

**Made with ❤️ for medical education**
