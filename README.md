# Gemini Chatroom Backend

A Node.js backend for a chatroom application with Google Gemini AI integration, featuring real-time messaging, authentication, and AI-powered conversations.

## 🚀 Features

- **Authentication**: JWT-based OTP authentication
- **Chatrooms**: Create and manage chatrooms
- **AI Integration**: Google Gemini AI for intelligent responses
- **Real-time Messaging**: Queue-based message processing
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for performance optimization
- **Subscriptions**: Stripe integration for premium features

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Queue**: BullMQ for background jobs
- **AI**: Google Gemini API
- **Authentication**: JWT tokens
- **Payments**: Stripe

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis server
- Google Gemini API key
- Stripe account (for payments)

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd kukuva_tech
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/gemini_chatroom"
   
   # Redis
   REDIS_URL="redis://localhost:6379"
   
   # JWT
   JWT_SECRET="your-jwt-secret"
   JWT_EXPIRES_IN="7d"
   
   # Google Gemini
   GEMINI_API_KEY="your-gemini-api-key"
   
   # Stripe (optional)
   STRIPE_SECRET_KEY="your-stripe-secret-key"
   STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
   ```

4. **Set up database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The server will be available at `http://localhost:3000`

## 🌐 Deployment

### Railway (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Railway**
   - Go to [Railway.app](https://railway.app)
   - Connect your GitHub repository
   - Add environment variables
   - Deploy!

### Environment Variables for Production

Set these in your deployment platform:

```env
# Database
DATABASE_URL="your-production-database-url"

# Redis
REDIS_URL="your-production-redis-url"

# JWT
JWT_SECRET="your-production-jwt-secret"
JWT_EXPIRES_IN="7d"

# Google Gemini
GEMINI_API_KEY="your-gemini-api-key"

# Stripe (optional)
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"

# App
NODE_ENV="production"
PORT="3000"
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP and get token
- `POST /api/auth/forgot-password` - Send password reset OTP
- `POST /api/auth/reset-password` - Reset password with OTP

### Chatrooms
- `GET /api/chatroom` - Get user's chatrooms
- `POST /api/chatroom` - Create new chatroom
- `GET /api/chatroom/:id` - Get specific chatroom
- `PUT /api/chatroom/:id` - Update chatroom
- `DELETE /api/chatroom/:id` - Delete chatroom

### Messages
- `POST /api/chatroom/:id/send-message` - Send message with AI processing
- `GET /api/chatroom/:id/messages` - Get chatroom messages
- `GET /api/chatroom/:id/messages/recent` - Get recent messages

### AI Integration
- `GET /api/gemini/health` - Check Gemini API health
- `POST /api/gemini/generate` - Generate AI response

### Queue Management
- `GET /api/queue/stats` - Get queue statistics
- `GET /api/queue/overview` - Queue dashboard

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push database schema
- `npm run db:migrate` - Run database migrations

### Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── workers/         # Background job workers
└── index.ts         # Application entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team. 