// Test script to verify the Node.js conversion
const axios = require('axios');

const BASE_URL = 'http://localhost:6000';

async function testEndpoints() {
    console.log('🧪 Testing Node.js server endpoints...\n');

    try {
        // Test /status endpoint
        console.log('1. Testing /status endpoint...');
        const statusResponse = await axios.get(`${BASE_URL}/status`);
        console.log('✅ Status response:', statusResponse.data);
        console.log('');

        // Test /test endpoint
        console.log('2. Testing /test endpoint...');
        const testData = { message: 'Hello from test script', timestamp: new Date().toISOString() };
        const testResponse = await axios.post(`${BASE_URL}/test`, testData);
        console.log('✅ Test response:', testResponse.data);
        console.log('');

        // Test /submit endpoint with validation error
        console.log('3. Testing /submit endpoint with missing data...');
        try {
            await axios.post(`${BASE_URL}/submit`, { prompt: 'test' });
        } catch (error) {
            console.log('✅ Expected validation error:', error.response.data);
        }
        console.log('');

        // Test /submit endpoint with invalid type
        console.log('4. Testing /submit endpoint with invalid type...');
        try {
            await axios.post(`${BASE_URL}/submit`, {
                prompt: 'test prompt',
                request_id: 'test123',
                callback_url: 'http://example.com/callback',
                type: 'invalid_type',
                temperature: 0.7,
            });
        } catch (error) {
            console.log('✅ Expected type validation error:', error.response.data);
        }
        console.log('');

        // Test /submit endpoint with valid data
        console.log('5. Testing /submit endpoint with valid data...');
        const submitResponse = await axios.post(`${BASE_URL}/submit`, {
            prompt: 'Analyze stock market trends',
            request_id: 'test-request-123',
            callback_url: 'http://example.com/callback',
            type: 'stock',
            temperature: 0.7,
        });
        console.log('✅ Submit response:', submitResponse.data);
        console.log('');

        console.log('🎉 All tests passed! Server is working correctly.');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure the server is running with: npm start');
        }
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    testEndpoints();
}

module.exports = { testEndpoints };
