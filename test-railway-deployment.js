const Redis = require('ioredis');

async function testRailwayDeployment() {
  console.log('🔍 Testing Railway deployment configuration...');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '❌ Not set');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  
  // Test Redis connection
  if (process.env.REDIS_URL) {
    console.log('\n🔴 Testing Redis connection...');
    try {
      const redis = new Redis(process.env.REDIS_URL);
      
      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });
      
      redis.on('error', (err) => {
        console.log('❌ Redis connection error:', err.message);
      });
      
      // Test basic operations
      await redis.set('test', 'hello');
      const value = await redis.get('test');
      console.log('✅ Redis test successful:', value);
      
      await redis.quit();
      console.log('✅ Redis test completed');
      
    } catch (error) {
      console.log('❌ Redis test failed:', error.message);
    }
  } else {
    console.log('\n⚠️  REDIS_URL not set - skipping Redis test');
  }
  
  // Test database connection
  if (process.env.DATABASE_URL) {
    console.log('\n🗄️  Testing Database connection...');
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });
      
      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully');
      
      await prisma.$disconnect();
      
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
    }
  } else {
    console.log('\n⚠️  DATABASE_URL not set - skipping Database test');
  }
  
  console.log('\n🎯 Railway Deployment Test Complete!');
}

testRailwayDeployment().catch(console.error); 