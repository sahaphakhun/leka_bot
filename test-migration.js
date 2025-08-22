// Test Migration and API Script
const https = require('https');

const BASE_URL = 'https://lekabot-production.up.railway.app';

// Helper function to make HTTP requests
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

async function testMigration() {
  console.log('🚀 Testing Migration and API...\n');

  try {
    // Step 1: Check health
    console.log('1️⃣ Checking server health...');
    const health = await makeRequest('/health');
    console.log('Health Status:', health.status);
    console.log('Health Response:', health.data);
    console.log('');

    // Step 2: Run KPI Enum migration
    console.log('2️⃣ Running KPI Enum migration...');
    const migration = await makeRequest('/api/admin/migrate-kpi-enum', 'POST');
    console.log('Migration Status:', migration.status);
    console.log('Migration Response:', migration.data);
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
    console.log(`- Migration: ${migration.status === 200 ? '✅ Success' : '❌ Failed'}`);
    console.log(`- Leaderboard: ${leaderboard.status === 200 ? '✅ Success' : '❌ Failed'}`);

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run the test
testMigration();
