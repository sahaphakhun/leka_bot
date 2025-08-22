// Test Leaderboard API with detailed error reporting
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

async function testLeaderboard() {
  console.log('🔍 Testing Leaderboard API with detailed error reporting...\n');

  const testGroupId = '2f5b9113-b8cf-4196-8929-bff6b26cbd65';

  try {
    // Test 1: Check if group exists
    console.log('1️⃣ Checking if group exists...');
    const groupCheck = await makeRequest(`/api/groups/${testGroupId}`);
    console.log('Group Status:', groupCheck.status);
    console.log('Group Response:', groupCheck.data);
    console.log('');

    // Test 2: Check group members
    console.log('2️⃣ Checking group members...');
    const membersCheck = await makeRequest(`/api/groups/${testGroupId}/members`);
    console.log('Members Status:', membersCheck.status);
    console.log('Members Response:', membersCheck.data);
    console.log('');

    // Test 3: Test Leaderboard API
    console.log('3️⃣ Testing Leaderboard API...');
    const leaderboard = await makeRequest(`/api/groups/${testGroupId}/leaderboard?period=weekly&limit=3`);
    console.log('Leaderboard Status:', leaderboard.status);
    console.log('Leaderboard Response:', leaderboard.data);
    
    if (leaderboard.data && leaderboard.data.details) {
      console.log('\n🔍 Error Details:');
      console.log('Error Message:', leaderboard.data.details);
    }
    console.log('');

    // Test 4: Check database schema
    console.log('4️⃣ Checking database schema...');
    const schemaCheck = await makeRequest('/api/admin/migrate');
    console.log('Schema Check Status:', schemaCheck.status);
    console.log('Schema Check Response:', schemaCheck.data);
    console.log('');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run the test
testLeaderboard();
