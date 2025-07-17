#!/bin/bash

echo "🚀 Setting up Kukuva Tech Chatroom Backend with Docker"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your actual API keys and secrets"
    echo "   - GEMINI_API_KEY: Get from https://makersuite.google.com/app/apikey"
    echo "   - JWT_SECRET: Change to a secure random string"
    echo "   - STRIPE_SECRET_KEY: Optional, for payment features"
fi

# Build and start the services
echo "🔨 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

echo "📊 Database migration..."
docker-compose exec app npm run db:migrate

echo "🎉 Setup complete!"
echo ""
echo "📡 Your application is running at:"
echo "   - API: http://localhost:3000/api"
echo "   - Health Check: http://localhost:3000/health"
echo "   - Queue Dashboard: http://localhost:3000/api/queue/overview"
echo ""
echo "🗄️  Database:"
echo "   - PostgreSQL: localhost:5432"
echo "   - Database: kukuva_chatroom"
echo "   - User: kukuva_user"
echo "   - Password: kukuva_password"
echo ""
echo "🔴 Redis:"
echo "   - Host: localhost:6379"
echo ""
echo "📝 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart: docker-compose restart"
echo "   - Rebuild: docker-compose up --build -d" 