# Deployment Guide

This document provides comprehensive instructions for deploying the Kana Dojo application, from local development to production environments.

## 🚀 Environment Requirements

### Local Development
- **Operating System**: Works on Windows, macOS, Linux
- **Node.js**: Version 18+ LTS recommended
- **Docker**: Version 20+ with Docker Compose plugin
- **Database**: PostgreSQL 12+ (when not using Docker setup)

### Production Environment  
- **Orchestration**: Docker Compose or Kubernetes
- **Platform**: Any cloud provider capable of running container apps (AWS ECS, Google Cloud Run, Digital Ocean, etc.)
- **Database**: Managed PostgreSQL (e.g. AWS RDS, Google Cloud SQL)
- **Storage**: Persistent storage volume for user-uploaded content

## 📦 Prerequisites

### Environment Variables
Both frontend and backend require environment configuration. Set up these files before deployment:

#### Backend `.env` (located at `backend/.env`)
```env
DATABASE_URL=postgresql://kanadojo:password@postgres:5432/kanadojo
JWT_SECRET=your-secret-key-here-32-characters-min
CORS_ORIGIN=http://localhost:3000
UPLOAD_MOUNT_PATH=./uploads
N8N_WEBHOOK_URL=http://your-n8n-instance:5678/webhook
N8N_CSV_IMPORT_WEBHOOK_URL=http://your-n8n-instance:5678/webhook/csv-import
N8N_READING_WEBHOOK_URL=http://your-n8n-instance:5678/webhook/generate-reading
N8N_USERNAME=optional-n8n-user
N8N_PASSWORD=optional-n8n-password
```

#### Frontend `.env.local` (located at `frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=optional-sentry-url
```

> [!IMPORTANT]
> Ensure strong values for JWT_SECRET in production. Use services like `openssl rand -base64 32` to generate cryptographically secure keys.

## 🏗️ Deployment Methods

### Method 1: Docker Compose (Recommended for Production)

This approach orchestrates the full-stack application with a managed database and consistent environments.

#### Setup Process
1. Clone the repository:
```bash
git clone <repository-url>
cd kana-dojo
```

2. Update the `docker-compose.yml` with production settings:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kanadojo
      POSTGRES_USER: kanadojo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports: 
      - "5432:5432" # Remove in production
    restart: always

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${FRONTEND_URL}
      UPLOAD_MOUNT_PATH: /app/uploads
      N8N_WEBHOOK_URL: ${N8N_WEBHOOK_URL}
    depends_on:
      - postgres
    ports:
      - "4000:4000"
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: ${BACKEND_URL}
    depends_on:
      - backend
    ports:
      - "3000:3000"
    restart: always

volumes:
  postgres_data:
```

3. Store environment variables securely:
```bash
# Create .env at project root with production secrets
touch .env
# Add all the environment variables in this file
```

4. Bring up the application:
```bash
docker-compose up -d
```

5. Run initial setup:
```bash
# Enter the backend container to run setup scripts
docker exec -it kanadojo-backend sh
npm run setup:prod # Hypothetical setup script - adjust for reality
```

### Method 2: Individual Deployment (Not Recommended)

#### Backend API Server
1. Prepare the server:
```bash
# Install Node.js and PM2 process manager
curl -sL https://rpm.nodesource.com/setup_18.x | sudo -E bash -
sudo yum install -y nodejs
sudo npm install pm2 -g
```

2. Build and deploy by setting environment variables and copying built artifact:
```bash
# In your deployment script:
cd backend
npm ci --only=production
pm2 start dist/src/server.js --name="kana-dojo-backend"
```

3. Configure the PM2 startup script:
```bash
pm2 startup
pm2 save
```

#### Frontend (Next.js)
1. Build and deploy the frontend application:
```bash
cd frontend
npm run build

# Configure your hosting service (Vercel, Netlify, AWS S3, etc.)
# with proper environment variables
```

## 🐳 Docker Image Building & Optimization

### Backend Dockerfile Optimization
The backend container is optimized with:
- Multi-stage build to keep image size minimal
- Layer caching through careful COPY ordering  
- Dependencies copied separately from source files
- Production-only dependencies installation

### Frontend Dockerfile Optimization
The frontend container includes:
- Built-time dictionary sharding (critical step!)

> [!WARNING]
> The `frontend/Dockerfile` builder stage runs `node scripts/shard_dictionaries.js` BEFORE `npm run build`. This generates ~8,800 static JSON shards and copies radical dictionaries into `public/data-wanikani/`. Dictionary source files in `frontend/data/` must exist for this to succeed. Deployments will fail if these source files are missing.

## 🔄 Deployment Automation

### GitHub Actions Process
The CI/CD follows:
1. Run tests on PRs to main branch
2. Build both frontend and backend on merge
3. Push to container registry (Docker Hub, GitHub Container Registry, ECR)
4. Deploy to your production environment
5. Run smoke tests against deployed application

### Health Checks and Restart Policies
- **Backend**: Health check endpoint at `/health` returns 200 OK response
- **Frontend**: Basic connectivity and asset availability check
- **Database**: Connection verification in backend initialization   
- **Restart policy**: Always, since this must maintain uptime

## ⚙️ Configuration Management

### Environment Variants
- **Development**: Local development with hot reloading and verbose logging
- **Staging**: Similar to production, but may include debug tools
- **Production**: Optimized builds with error tracking and security hardening

### Secrets Management
Ensure sensitive configuration remains secret:

#### Development
- Simple `.env` files, excluded from git with `.gitignore`

#### Staged / Production
- Use platform-native secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- Encrypt files if checked into repository (sops, git-crypt, Azure Key Vault)
- Use environment variables for config data, not configuration files
- Deploy-time secret injection into containers (Kubernetes secrets, Docker secrets)

## 🧪 Verification Checklist

### Pre-Deployment
- [ ] All tests pass in CI
- [ ] Database migration scripts ready and tested
- [ ] Rollback plan prepared
- [ ] Monitoring and alerting configured

### Post-Deployment
- [ ] Application responds to HTTP requests across all routes
- [ ] Database connectivity verified  
- [ ] Logging properly captures and sends data
- [ ] Performance monitoring activated
- [ ] User flows working correctly (automated smoke tests)

## 🛠️ Troubleshooting

### Common Issues

#### Docker Environment Not Loading
Solution: Double-check that environment variables are loaded using `docker-compose config` to verify they've been injected.

#### Database Migrations Fail
Problem often occurs after code/dependency changes.
Solution: Run migrations manually from backend container with `npx prisma migrate deploy`.

#### Assets Not Loading After Deploy (Especially Dictionaries)
This relates to the critical front-end build step mentioned in Architecture – the sharding process must complete successfully or the dictionary search will be broken.

#### PDF Upload Pipeline Not Working  
Verify that `pollingService` and `filesystemService` are active and that the upload directory has appropriate permissions for read/write access.

## 🛡️ Security Considerations

### Container Security
- Use official, minimal base images (Alpine-based images preferred)
- Run processes without root privileges
- Regular vulnerability scanning of images
- Stay current with base image patches

### Network Security
- Frontend to backend communication with HTTPS in production
- Database listens only on local interface (not externally)
- Firewall restricts traffic to only required ports

### Data Security
- JWT tokens with proper expiration
- Input validation and sanitization
- Password hashing with bcrypt or similar
- Secure headers on all responses

## 📈 Scaling Considerations

### Horizontal Scaling
- Both frontend and backend can scale horizontally
- Sticky sessions not required for frontend
- Database connection pooling configured in backend

### Database Scaling
- PostgreSQL read replicas for read-heavy operations
- Connection pool sizing for peak load requirements
- Archiving old data that's infrequently accessed

---

Following this guide will result in a robust, monitored, and secure deployment of the Kana Dojo application that can handle real-world usage while maintaining stability and performance.
