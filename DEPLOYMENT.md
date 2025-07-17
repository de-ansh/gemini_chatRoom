# 🚀 Deployment Guide

This guide covers deploying your Gemini Chatroom Backend to various free platforms.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Google Gemini API Key** - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **PostgreSQL Database** - Free options available
3. **Redis Instance** - Free options available
4. **GitHub Repository** - Your code pushed to GitHub

## 🌐 Free Deployment Options

### 1. Railway (Recommended) ⭐

**Free Tier:** $5/month credit (sufficient for small projects)

#### Setup Steps:

1. **Prepare your code**
   ```bash
   git add .
   git commit -m "Ready for Railway deployment"
   git push origin main
   ```

2. **Deploy on Railway**
   - Go to [Railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the Dockerfile

3. **Add Environment Variables**
   In Railway dashboard, add these variables:
   ```env
   DATABASE_URL=your-postgresql-url
   REDIS_URL=your-redis-url
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=7d
   GEMINI_API_KEY=your-gemini-api-key
   NODE_ENV=production
   PORT=3000
   ```

4. **Add PostgreSQL**
   - In Railway dashboard, click "New" → "Database" → "PostgreSQL"
   - Copy the connection URL to `DATABASE_URL`

5. **Add Redis**
   - In Railway dashboard, click "New" → "Database" → "Redis"
   - Copy the connection URL to `REDIS_URL`

6. **Deploy**
   - Railway will automatically deploy when you push to GitHub
   - Check the logs for any issues

### 2. Render

**Free Tier:** 750 hours/month, 512MB RAM

#### Setup Steps:

1. **Create render.yaml**
   ```yaml
   services:
     - type: web
       name: gemini-chatroom-backend
       env: node
       buildCommand: npm install && npm run build
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: DATABASE_URL
           sync: false
         - key: REDIS_URL
           sync: false
         - key: JWT_SECRET
           sync: false
         - key: GEMINI_API_KEY
           sync: false
   ```

2. **Deploy on Render**
   - Go to [Render.com](https://render.com)
   - Connect your GitHub repository
   - Select "Web Service"
   - Configure environment variables
   - Deploy!

### 3. Fly.io

**Free Tier:** 3 shared-cpu VMs, 3GB persistent volume

#### Setup Steps:

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login to Fly**
   ```bash
   fly auth login
   ```

3. **Create app**
   ```bash
   fly apps create gemini-chatroom-backend
   ```

4. **Deploy**
   ```bash
   fly deploy
   ```

5. **Set secrets**
   ```bash
   fly secrets set DATABASE_URL="your-db-url"
   fly secrets set REDIS_URL="your-redis-url"
   fly secrets set JWT_SECRET="your-secret"
   fly secrets set GEMINI_API_KEY="your-api-key"
   ```

## 🗄️ Database Setup

### Free PostgreSQL Options:

1. **Railway PostgreSQL** (Free with Railway)
2. **Neon** (Free tier: 3GB storage)
3. **Supabase** (Free tier: 500MB database)
4. **PlanetScale** (Free tier: 1GB storage)

### Free Redis Options:

1. **Railway Redis** (Free with Railway)
2. **Upstash** (Free tier: 10,000 requests/day)
3. **Redis Cloud** (Free tier: 30MB storage)

## 🔧 Environment Variables

Set these in your deployment platform:

```env
# Required
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://user:password@host:port
JWT_SECRET=your-super-secret-jwt-key
GEMINI_API_KEY=your-google-gemini-api-key

# Optional
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
```

## 🚀 Post-Deployment

### 1. Database Migration
After deployment, run database migrations:
```bash
# If using Railway CLI
railway run npm run db:migrate

# If using Render
# Add to build command: npm run db:migrate
```

### 2. Health Check
Test your deployment:
```bash
curl https://your-app-url.railway.app/health
```

### 3. API Testing
Test the main endpoints:
```bash
# Health check
curl https://your-app-url.railway.app/api/health

# Send OTP
curl -X POST https://your-app-url.railway.app/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "1234567890", "purpose": "login"}'
```

## 🔍 Troubleshooting

### Common Issues:

1. **Build fails**
   - Check if all dependencies are in `package.json`
   - Ensure TypeScript compilation works locally

2. **Database connection fails**
   - Verify `DATABASE_URL` is correct
   - Check if database is accessible from deployment region

3. **Redis connection fails**
   - Verify `REDIS_URL` is correct
   - Check Redis instance is running

4. **Gemini API errors**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API key has proper permissions

### Logs
Check deployment logs for errors:
- **Railway:** Dashboard → Your app → Deployments → View logs
- **Render:** Dashboard → Your service → Logs
- **Fly.io:** `fly logs`

## 📊 Monitoring

### Health Endpoints:
- `/health` - Basic health check
- `/api/health` - Detailed health with database/Redis status

### Queue Monitoring:
- `/api/queue/stats` - Queue statistics
- `/api/queue/overview` - Queue dashboard

## 💰 Cost Optimization

### Free Tier Limits:
- **Railway:** $5/month credit
- **Render:** 750 hours/month
- **Fly.io:** 3 shared-cpu VMs

### Tips:
1. Use free tier databases
2. Monitor usage in dashboard
3. Set up alerts for usage limits
4. Consider upgrading only when needed

## 🔐 Security

### Production Checklist:
- [ ] Use strong JWT secrets
- [ ] Set up HTTPS (automatic on most platforms)
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable security headers

## 📞 Support

If you encounter issues:
1. Check the logs in your deployment platform
2. Verify all environment variables are set
3. Test locally first
4. Check platform-specific documentation

---

**Happy Deploying! 🚀** 