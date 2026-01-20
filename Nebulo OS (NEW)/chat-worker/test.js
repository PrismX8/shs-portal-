// Test script for Chat Worker
// Run with: node test.js

const BASE_URL = 'https://chat-worker.ethan-owsiany.workers.dev';

async function testWorker() {
  console.log('🧪 Testing Chat Worker...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test 2: Send a message
    console.log('\n2. Testing message sending...');
    const messageResponse = await fetch(`${BASE_URL}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'TestUser',
        text: 'Hello from test script!'
      })
    });
    const messageData = await messageResponse.json();
    console.log('✅ Message sent:', messageData);

    // Test 3: Get recent messages
    console.log('\n3. Testing message retrieval...');
    const recentResponse = await fetch(`${BASE_URL}/chat/recent?limit=5`);
    const recentData = await recentResponse.json();
    console.log('✅ Recent messages:', recentData);

    // Test 4: Rate limiting test
    console.log('\n4. Testing rate limiting (sending multiple messages)...');
    for (let i = 0; i < 5; i++) {
      const rateTestResponse = await fetch(`${BASE_URL}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'RateTestUser',
          text: `Rate limit test message ${i + 1}`
        })
      });
      const rateTestData = await rateTestResponse.json();
      console.log(`   Message ${i + 1}:`, rateTestResponse.status === 429 ? '❌ Rate limited' : '✅ Sent');
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testWorker();
}

module.exports = { testWorker };


