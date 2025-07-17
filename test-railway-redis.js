const Redis = require('ioredis');

async function testRedisConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log('🔍 Testing Redis connection...');
  console.log('Redis URL:', redisUrl);
  
  try {
    const redis = new Redis(redisUrl);
    
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
}

testRedisConnection(); 