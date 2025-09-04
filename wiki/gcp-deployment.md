# Google Cloud Platform Deployment Guide ☁️

## Overview

This guide provides step-by-step instructions for deploying the ePatient platform to Google Cloud Platform (GCP) using Cloud Run for the application and Cloud SQL for the database.

## Prerequisites

### Required Tools
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- [Docker](https://docs.docker.com/get-docker/)
- [Git](https://git-scm.com/)
- Active GCP account with billing enabled

### Required Access
- GCP project with Editor or Owner permissions
- Docker Hub or Google Container Registry access

## GCP Project Setup

### 1. Create and Configure Project

```bash
# Set your project ID (replace with your actual project ID)
export PROJECT_ID=\"epatient-production-123456\"
export REGION=\"us-central1\"
export SERVICE_NAME=\"epatient\"

# Create new project (if needed)
gcloud projects create $PROJECT_ID --name=\"ePatient Production\"

# Set as current project
gcloud config set project $PROJECT_ID

# Enable billing (replace BILLING_ACCOUNT_ID with your billing account)
# gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### 2. Enable Required APIs

```bash
# Enable all required services
gcloud services enable \\n  cloudbuild.googleapis.com \\n  run.googleapis.com \\n  sql-component.googleapis.com \\n  sqladmin.googleapis.com \\n  secretmanager.googleapis.com \\n  containerregistry.googleapis.com \\n  cloudresourcemanager.googleapis.com

# Verify enabled services
gcloud services list --enabled
```

### 3. Set Default Region

```bash
# Set default region for Cloud Run
gcloud config set run/region $REGION

# Set default region for Cloud SQL
gcloud config set sql/region $REGION
```

## Database Setup (Cloud SQL)

### 1. Create Cloud SQL Instance

```bash
# Create PostgreSQL instance
gcloud sql instances create ${SERVICE_NAME}-db \\n    --database-version=POSTGRES_15 \\n    --tier=db-f1-micro \\n    --region=$REGION \\n    --storage-type=SSD \\n    --storage-size=10GB \\n    --backup \\n    --backup-start-time=03:00 \\n    --maintenance-window-day=SUN \\n    --maintenance-window-hour=04

# For production, consider larger instance:
# --tier=db-custom-2-8192  # 2 vCPUs, 8GB RAM
```

### 2. Configure Database

```bash
# Create database
gcloud sql databases create epatient --instance=${SERVICE_NAME}-db

# Create database user
gcloud sql users create epatient-user \\n    --instance=${SERVICE_NAME}-db \\n    --password=$(openssl rand -base64 32)

# Get connection name for later use
CONNECTION_NAME=$(gcloud sql instances describe ${SERVICE_NAME}-db --format=\"value(connectionName)\")
echo \"Connection name: $CONNECTION_NAME\"
```

### 3. Configure Database Access

```bash
# For production, create private IP connection
# This requires VPC setup - for simplicity, we'll use public IP with authorized networks

# Get your current IP for authorized networks
MY_IP=$(curl -s http://whatismyip.akamai.com/)
echo \"Your IP: $MY_IP\"

# Add your IP to authorized networks (for setup only)
gcloud sql instances patch ${SERVICE_NAME}-db \\n    --authorized-networks=$MY_IP/32

# For production, consider using private IP and Cloud SQL Proxy
```

## Secrets Management

### 1. Create Application Secrets

```bash
# Generate and store authentication secrets
echo -n \"$(openssl rand -base64 32)\" | gcloud secrets create auth-secret --data-file=-
echo -n \"$(openssl rand -base64 32)\" | gcloud secrets create jwt-secret --data-file=-

# Store Discord OAuth credentials (replace with your actual values)
echo -n \"YOUR_DISCORD_CLIENT_ID\" | gcloud secrets create discord-client-id --data-file=-
echo -n \"YOUR_DISCORD_CLIENT_SECRET\" | gcloud secrets create discord-client-secret --data-file=-

# Store database connection string
echo -n \"postgresql://epatient-user:PASSWORD@/epatient?host=/cloudsql/$CONNECTION_NAME\" | \\n  gcloud secrets create database-url --data-file=-

# Replace PASSWORD with the actual password you used when creating the user
```

### 2. Grant Secret Access

```bash
# Create service account for Cloud Run
gcloud iam service-accounts create ${SERVICE_NAME}-runner \\n    --display-name=\"ePatient Cloud Run Service Account\"

# Grant Secret Manager access
for secret in auth-secret jwt-secret discord-client-id discord-client-secret database-url; do
  gcloud secrets add-iam-policy-binding $secret \\n    --member=\"serviceAccount:${SERVICE_NAME}-runner@${PROJECT_ID}.iam.gserviceaccount.com\" \\n    --role=\"roles/secretmanager.secretAccessor\"
done

# Grant Cloud SQL access
gcloud projects add-iam-policy-binding $PROJECT_ID \\n    --member=\"serviceAccount:${SERVICE_NAME}-runner@${PROJECT_ID}.iam.gserviceaccount.com\" \\n    --role=\"roles/cloudsql.client\"
```

## Application Deployment

### 1. Prepare Application Code

```bash
# Clone and prepare the repository
git clone https://github.com/your-org/epatient.git
cd epatient

# Create production environment file
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=\\$DATABASE_URL
AUTH_SECRET=\\$AUTH_SECRET
JWT_SECRET=\\$JWT_SECRET
AUTH_DISCORD_ID=\\$AUTH_DISCORD_ID
AUTH_DISCORD_SECRET=\\$AUTH_DISCORD_SECRET
EOF
```

### 2. Create Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
# Use official Node.js runtime as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
ENV NEXT_TELEMETRY_DISABLED 1
ENV SKIP_ENV_VALIDATION 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME \"0.0.0.0\"

# Start the application
CMD [\"node\", \"server.js\"]
```

### 3. Update Next.js Configuration

Update `next.config.js` for production:

```javascript
/** @type {import(\"next\").NextConfig} */
const config = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client'],
  },
  // Disable image optimization for Cloud Run
  images: {
    unoptimized: true,
  },
};

export default config;
```

### 4. Build and Deploy

```bash
# Submit build to Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/${SERVICE_NAME}

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \\n    --image gcr.io/$PROJECT_ID/${SERVICE_NAME} \\n    --platform managed \\n    --region $REGION \\n    --allow-unauthenticated \\n    --service-account=${SERVICE_NAME}-runner@${PROJECT_ID}.iam.gserviceaccount.com \\n    --add-cloudsql-instances $CONNECTION_NAME \\n    --set-env-vars NODE_ENV=production \\n    --set-secrets DATABASE_URL=database-url:latest \\n    --set-secrets AUTH_SECRET=auth-secret:latest \\n    --set-secrets JWT_SECRET=jwt-secret:latest \\n    --set-secrets AUTH_DISCORD_ID=discord-client-id:latest \\n    --set-secrets AUTH_DISCORD_SECRET=discord-client-secret:latest \\n    --memory 512Mi \\n    --cpu 1 \\n    --concurrency 100 \\n    --max-instances 10 \\n    --timeout 300
```

### 5. Run Database Migrations

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format=\"value(status.url)\")
echo \"Service URL: $SERVICE_URL\"

# Install Cloud SQL Proxy for local migration
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Start proxy in background
./cloud_sql_proxy -instances=$CONNECTION_NAME=tcp:5432 &
PROXY_PID=$!

# Wait for proxy to start
sleep 5

# Run migrations
DATABASE_URL=\"postgresql://epatient-user:PASSWORD@localhost:5432/epatient\" npm run db:push

# Clean up proxy
kill $PROXY_PID
rm cloud_sql_proxy
```

## Custom Domain Setup (Optional)

### 1. Map Custom Domain

```bash
# Replace with your domain
DOMAIN=\"yourdomain.com\"

# Create domain mapping
gcloud run domain-mappings create \\n    --service $SERVICE_NAME \\n    --domain $DOMAIN \\n    --region $REGION

# Get the required DNS records
gcloud run domain-mappings describe $DOMAIN --region=$REGION
```

### 2. Configure DNS

Add the required DNS records to your domain provider:

- **A Record**: Point to the IP provided by Google
- **AAAA Record**: Point to the IPv6 address provided by Google
- **CNAME Record**: For www subdomain (if needed)

### 3. Wait for SSL Certificate

Google will automatically provision an SSL certificate. This may take up to 24 hours.

```bash
# Check certificate status
gcloud run domain-mappings describe $DOMAIN --region=$REGION
```

## Monitoring and Logging

### 1. Enable Cloud Monitoring

```bash
# Create notification channel (replace with your email)
gcloud alpha monitoring channels create \\n    --display-name=\"ePatient Alerts\" \\n    --type=email \\n    --channel-labels=email_address=your-email@example.com
```

### 2. Set Up Alerts

```bash
# Create uptime check
gcloud monitoring uptime create $SERVICE_NAME \\n    --resource-type=\"uptime-url\" \\n    --hostname=\"$SERVICE_URL\" \\n    --path=\"/api/health\" \\n    --check-interval=60s

# Create alert policy for high error rate
gcloud alpha monitoring policies create \\n    --policy-from-file=monitoring-policy.yaml
```

### 3. View Logs

```bash
# View application logs
gcloud logs read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --limit=50

# Stream logs in real-time
gcloud logs tail \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\"
```

## Backup and Recovery

### 1. Database Backups

```bash
# Backups are automatic, but you can create manual backups
gcloud sql backups create --instance=${SERVICE_NAME}-db

# List backups
gcloud sql backups list --instance=${SERVICE_NAME}-db

# Restore from backup (if needed)
# gcloud sql backups restore BACKUP_ID --restore-instance=${SERVICE_NAME}-db
```

### 2. Application Rollback

```bash
# List revisions
gcloud run revisions list --service=$SERVICE_NAME --region=$REGION

# Rollback to previous revision
gcloud run services update-traffic $SERVICE_NAME \\n    --to-revisions=REVISION_NAME=100 \\n    --region=$REGION
```

## Scaling and Performance

### 1. Autoscaling Configuration

```bash
# Update service with new scaling parameters
gcloud run services update $SERVICE_NAME \\n    --region=$REGION \\n    --min-instances=1 \\n    --max-instances=50 \\n    --concurrency=1000 \\n    --cpu=2 \\n    --memory=1Gi
```

### 2. Database Scaling

```bash
# Scale up database instance
gcloud sql instances patch ${SERVICE_NAME}-db \\n    --tier=db-custom-4-16384  # 4 vCPUs, 16GB RAM

# Add read replicas for better performance
gcloud sql instances create ${SERVICE_NAME}-db-replica \\n    --master-instance-name=${SERVICE_NAME}-db \\n    --region=$REGION
```

## Security Hardening

### 1. Network Security

```bash
# Remove public database access (after setup)
gcloud sql instances patch ${SERVICE_NAME}-db \\n    --clear-authorized-networks

# Use private IP for production
gcloud sql instances patch ${SERVICE_NAME}-db \\n    --network=projects/$PROJECT_ID/global/networks/default \\n    --no-assign-ip
```

### 2. IAM Security

```bash
# Create custom IAM role with minimal permissions
gcloud iam roles create epatientRole \\n    --project=$PROJECT_ID \\n    --title=\"ePatient Service Role\" \\n    --description=\"Minimal permissions for ePatient service\" \\n    --permissions=\"cloudsql.instances.connect,secretmanager.versions.access\"

# Assign custom role to service account
gcloud projects add-iam-policy-binding $PROJECT_ID \\n    --member=\"serviceAccount:${SERVICE_NAME}-runner@${PROJECT_ID}.iam.gserviceaccount.com\" \\n    --role=\"projects/$PROJECT_ID/roles/epatientRole\"
```

## Cost Optimization

### 1. Resource Optimization

```bash
# Set up budget alerts
gcloud billing budgets create \\n    --billing-account=BILLING_ACCOUNT_ID \\n    --display-name=\"ePatient Budget\" \\n    --budget-amount=100USD \\n    --threshold-percent=50,90 \\n    --notification-channel-ids=CHANNEL_ID
```

### 2. Scheduled Scaling

```bash
# Scale down during low usage hours
# Create Cloud Scheduler job to scale down at night
gcloud scheduler jobs create http scale-down \\n    --schedule=\"0 2 * * *\" \\n    --uri=\"https://run.googleapis.com/v1/namespaces/$PROJECT_ID/services/$SERVICE_NAME\" \\n    --http-method=PATCH \\n    --message-body='{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"autoscaling.knative.dev/minScale\":\"0\"}}}}}'
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   gcloud builds log BUILD_ID
   
   # Common fixes:
   # - Ensure Dockerfile is correct
   # - Check for build timeout
   # - Verify all dependencies are included
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   gcloud sql connect ${SERVICE_NAME}-db --user=epatient-user
   
   # Check Cloud SQL instances
   gcloud sql instances list
   
   # Verify service account permissions
   gcloud projects get-iam-policy $PROJECT_ID
   ```

3. **Application Errors**
   ```bash
   # Check application logs
   gcloud logs read \"resource.type=cloud_run_revision\" --limit=100
   
   # Check environment variables
   gcloud run services describe $SERVICE_NAME --region=$REGION
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check domain mapping status
   gcloud run domain-mappings describe $DOMAIN --region=$REGION
   
   # Verify DNS records
   nslookup $DOMAIN
   ```

### Getting Support

- **GCP Support**: Use Google Cloud Console support
- **Documentation**: [Cloud Run Docs](https://cloud.google.com/run/docs)
- **Community**: [Google Cloud Community](https://cloud.google.com/community)

## Maintenance

### Regular Tasks

1. **Update Dependencies**
   ```bash
   # Update and redeploy monthly
   npm update
   gcloud builds submit --tag gcr.io/$PROJECT_ID/${SERVICE_NAME}
   gcloud run deploy $SERVICE_NAME --image gcr.io/$PROJECT_ID/${SERVICE_NAME}
   ```

2. **Monitor Performance**
   ```bash
   # Check metrics weekly
   gcloud monitoring metrics list
   ```

3. **Review Logs**
   ```bash
   # Check for errors daily
   gcloud logs read \"severity>=ERROR\" --limit=50
   ```

## Production Checklist

Before going live:

- [ ] Database backups enabled
- [ ] SSL certificate provisioned
- [ ] Monitoring and alerting configured
- [ ] Environment variables secured
- [ ] Custom domain configured
- [ ] Load testing completed
- [ ] Security review completed
- [ ] Budget alerts configured
- [ ] Incident response plan ready
- [ ] Documentation updated

---

**Congratulations!** Your ePatient application is now deployed on Google Cloud Platform. 🎉

For ongoing maintenance and updates, refer to the [Operations Guide](operations-guide.md)."