# ePatient Project Wiki 📚

Welcome to the comprehensive documentation for the ePatient clinical simulation platform. This wiki provides detailed information about the system architecture, development processes, and deployment procedures.

## 📖 Table of Contents

### Getting Started
- [Quick Start Guide](quick-start-guide.md) - Get up and running in minutes
- [Development Setup](development-guide.md) - Detailed development environment setup
- [Environment Configuration](environment-configuration.md) - Environment variables and configuration
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

### Architecture
- [System Overview](system-overview.md) - High-level system architecture
- [Technology Stack](technology-stack.md) - Technologies and frameworks used
- [Database Schema](database-schema.md) - Data models and relationships
- [API Documentation](api-documentation.md) - tRPC API reference
- [Security Model](security-model.md) - Authentication and authorization

### Features
- [User Management](user-management.md) - User roles and permissions
- [Authentication Flow](authentication-flow.md) - Login and OAuth integration
- [Dashboard System](dashboard-system.md) - Role-based dashboards
- [Clinical Simulations](clinical-simulations.md) - Simulation engine and scenarios
- [Evaluation System](evaluation-system.md) - Assessment and feedback

### Development
- [Code Standards](code-standards.md) - Coding guidelines and best practices
- [Testing Strategy](testing-strategy.md) - Unit, integration, and E2E testing
- [Development Workflow](development-workflow.md) - Git workflow and collaboration
- [Performance Guidelines](performance-guidelines.md) - Optimization best practices
- [Security Best Practices](security-best-practices.md) - Security guidelines

### Deployment
- [Deployment Guide](deployment-guide.md) - Complete deployment instructions
- [Google Cloud Platform](gcp-deployment.md) - GCP-specific deployment
- [Environment Setup](production-environment.md) - Production environment configuration
- [Monitoring & Logging](monitoring-logging.md) - Application monitoring
- [Backup & Recovery](backup-recovery.md) - Data backup strategies

### Operations
- [Scaling Guidelines](scaling-guidelines.md) - Horizontal and vertical scaling
- [Incident Response](incident-response.md) - Emergency procedures
- [Maintenance Tasks](maintenance-tasks.md) - Regular maintenance procedures
- [Performance Monitoring](performance-monitoring.md) - Performance tracking

## 🔍 Quick Navigation

### For Developers
- New to the project? Start with [Quick Start Guide](quick-start-guide.md)
- Setting up development? See [Development Setup](development-guide.md)
- Need API docs? Check [API Documentation](api-documentation.md)
- Working on features? Review [Code Standards](code-standards.md)

### For DevOps
- Deploying to production? See [Deployment Guide](deployment-guide.md)
- Setting up monitoring? Check [Monitoring & Logging](monitoring-logging.md)
- Need scaling guidance? Review [Scaling Guidelines](scaling-guidelines.md)

### For System Administrators
- Understanding the system? Start with [System Overview](system-overview.md)
- Security concerns? Check [Security Model](security-model.md)
- Backup strategies? See [Backup & Recovery](backup-recovery.md)

## 🎯 Project Goals

The ePatient platform aims to:

1. **Enhance Medical Education** - Provide realistic clinical simulations for medical training
2. **Improve Learning Outcomes** - Use evidence-based assessment and feedback mechanisms
3. **Ensure Type Safety** - Maintain end-to-end type safety across the full stack
4. **Scale Effectively** - Support growing user bases and feature sets
5. **Maintain Security** - Protect sensitive medical education data

## 🏗️ System Architecture at a Glance

```
Frontend (Next.js 15)
    ↓ tRPC calls
API Layer (tRPC 11)
    ↓ ORM queries
Database (Drizzle + LibSQL/PostgreSQL)
    ↑
Authentication (NextAuth.js 5 + Discord OAuth)
```

## 🤝 Contributing to Documentation

This documentation is a living resource. To contribute:

1. **Fork** the repository
2. **Edit** or create documentation files in the `wiki/` directory
3. **Follow** the documentation standards outlined in [Code Standards](code-standards.md)
4. **Submit** a pull request with your changes

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Add diagrams for complex concepts
- Keep content up-to-date with code changes
- Cross-reference related documentation

## 📞 Getting Help

If you need assistance:

1. **Search** this wiki for existing documentation
2. **Check** the [Troubleshooting](troubleshooting.md) guide
3. **Review** relevant GitHub issues
4. **Create** a new issue with detailed information
5. **Contact** the development team

---

**Last Updated**: September 2025  
**Wiki Version**: 1.0  
**Project Version**: 0.1.0

*This wiki is maintained by the ePatient development team and community contributors.*