# 🚂 Railway Deployment Guide

## Prerequisites
- Railway account (free tier available)
- GitHub repository with your code
- Gemini API key

## Step 1: Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository

## Step 2: Add Database Service

1. In your Railway project, click "New Service"
2. Choose "Database" → "PostgreSQL"
3. Railway will automatically provide a `DATABASE_URL` environment variable

## Step 3: Add Redis Service

1. Click "New Service" again
2. Choose "Database" → "Redis"
3. Railway will automatically provide a `REDIS_URL` environment variable

## Step 4: Configure Environment Variables

In your main app service, add these environment variables:

### Required Variables:
```bash
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key-here
```

### Optional Variables:
```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
CORS_ORIGIN=https://your-frontend-domain.com
```

### Database & Redis (Auto-provided by Railway):
- `DATABASE_URL` - Automatically set by Railway PostgreSQL service
- `REDIS_URL` - Automatically set by Railway Redis service

## Step 5: Deploy

1. Railway will automatically detect your Dockerfile
2. Click "Deploy" to start the build process
3. Wait for the build to complete

## Step 6: Run Database Migrations

After deployment, run database migrations:

1. Go to your app service in Railway
2. Click on "Deployments" tab
3. Click on the latest deployment
4. Open the terminal and run:
```bash
npm run db:migrate
```

## Step 7: Test Your Deployment

Your app will be available at:
- **API**: `https://your-app-name.railway.app/api`
- **Health Check**: `https://your-app-name.railway.app/health`
- **Queue Dashboard**: `https://your-app-name.railway.app/api/queue/overview`

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection (auto-provided) |
| `REDIS_URL` | ✅ | Redis connection (auto-provided) |
| `JWT_SECRET` | ✅ | Secret for JWT tokens |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `NODE_ENV` | ✅ | Set to `production` |
| `STRIPE_SECRET_KEY` | ❌ | For payment features |
| `STRIPE_WEBHOOK_SECRET` | ❌ | For Stripe webhooks |
| `CORS_ORIGIN` | ❌ | Frontend domain for CORS |

## Troubleshooting

### Build Issues
- Check Railway logs for build errors
- Ensure Dockerfile is in the root directory
- Verify all dependencies are in package.json

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check if PostgreSQL service is running
- Run migrations: `npm run db:migrate`

### Redis Connection Issues
- Verify `REDIS_URL` is set correctly
- Check if Redis service is running

### API Issues
- Check application logs in Railway
- Verify all environment variables are set
- Test health endpoint: `/health`

## Railway Advantages

✅ **Free Tier Available**
- 500 hours/month free
- 1GB RAM, 1GB storage
- Perfect for development/testing

✅ **Automatic Deployments**
- Deploys on every Git push
- Zero-downtime deployments

✅ **Built-in Services**
- PostgreSQL and Redis included
- No need to manage databases

✅ **Custom Domains**
- Add your own domain
- SSL certificates included

✅ **Environment Management**
- Separate environments for dev/staging/prod
- Easy environment variable management

## Cost Estimation

**Free Tier:**
- 500 hours/month
- 1GB RAM, 1GB storage
- Perfect for development

**Paid Plans:**
- $5/month for 1GB RAM
- $10/month for 2GB RAM
- Scales based on usage

## Next Steps

1. **Set up custom domain** (optional)
2. **Configure CI/CD** with GitHub
3. **Set up monitoring** and alerts
4. **Configure backups** for database
5. **Set up staging environment**

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: For code-specific issues 