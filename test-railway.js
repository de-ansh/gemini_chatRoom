#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Get the domain from command line or use default
const domain = process.argv[2] || 'geminichatroom.up.railway.app';

console.log(`🔍 Testing Railway deployment: ${domain}`);
console.log('='.repeat(50));

// Test HTTP first
function testHTTP() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: domain,
      port: 80,
      path: '/health',
      method: 'GET',
      timeout: 10000,
    }, (res) => {
      console.log(`✅ HTTP Health Check: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`❌ HTTP Error: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌ HTTP Timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Test HTTPS
function testHTTPS() {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: domain,
      port: 443,
      path: '/health',
      method: 'GET',
      timeout: 10000,
    }, (res) => {
      console.log(`✅ HTTPS Health Check: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`❌ HTTPS Error: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌ HTTPS Timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Test DNS resolution
function testDNS() {
  return new Promise((resolve) => {
    const dns = require('dns');
    dns.lookup(domain, (err, address, family) => {
      if (err) {
        console.log(`❌ DNS Error: ${err.message}`);
        resolve(false);
      } else {
        console.log(`✅ DNS Resolution: ${address} (IPv${family})`);
        resolve(true);
      }
    });
  });
}

// Run all tests
async function runTests() {
  console.log('1. Testing DNS resolution...');
  const dnsOk = await testDNS();
  
  if (!dnsOk) {
    console.log('\n❌ DNS resolution failed. The domain might not exist or be misconfigured.');
    console.log('💡 Check your Railway dashboard for the correct domain name.');
    process.exit(1);
  }

  console.log('\n2. Testing HTTP connection...');
  const httpOk = await testHTTP();
  
  console.log('\n3. Testing HTTPS connection...');
  const httpsOk = await testHTTPS();

  console.log('\n' + '='.repeat(50));
  
  if (httpOk || httpsOk) {
    console.log('✅ Deployment is accessible!');
    console.log('💡 If you see 404 errors, the app might be running but the health endpoint might not be available.');
  } else {
    console.log('❌ Deployment is not accessible');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check Railway dashboard for deployment status');
    console.log('2. Verify the domain name is correct');
    console.log('3. Check if the app is running (not crashed)');
    console.log('4. Verify environment variables are set correctly');
    console.log('5. Check Railway logs for errors');
  }
}

runTests().catch(console.error); 