// Test Database Connection Script
const https = require('https');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'lekabot-production.up.railway.app',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');

  try {
    // Step 1: Check server health
    console.log('1️⃣ Checking server health...');
    const health = await makeRequest('/health');
    console.log('Health Status:', health.status);
    console.log('Health Response:', health.data);
    console.log('');

    // Step 2: Check database connection
    console.log('2️⃣ Checking database connection...');
    const dbCheck = await makeRequest('/api/admin/check-db');
    console.log('Database Check Status:', dbCheck.status);
    console.log('Database Check Response:', dbCheck.data);
    console.log('');

    // Step 3: Test Leaderboard API
    console.log('3️⃣ Testing Leaderboard API...');
    const leaderboard = await makeRequest('/api/groups/2f5b9113-b8cf-4196-8929-bff6b26cbd65/leaderboard?period=weekly&limit=3');
    console.log('Leaderboard Status:', leaderboard.status);
    console.log('Leaderboard Response:', leaderboard.data);
    console.log('');

    // Step 4: Summary
    console.log('📊 Summary:');
    console.log(`- Health: ${health.status === 200 ? '✅ OK' : '❌ Failed'}`);
    console.log(`- Database: ${dbCheck.status === 200 ? '✅ Connected' : '❌ Failed'}`);
    console.log(`- Leaderboard: ${leaderboard.status === 200 ? '✅ Working' : '❌ Failed'}`);

    if (dbCheck.status !== 200) {
      console.log('\n🔧 Database connection failed. Possible issues:');
      console.log('1. DATABASE_URL environment variable is incorrect');
      console.log('2. Database server is down or unreachable');
      console.log('3. Network connectivity issues');
      console.log('4. Railway database service is not running');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run the test
testDatabaseConnection();
