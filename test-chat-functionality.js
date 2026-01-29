// Test script to verify Universal Chat functionality
// Run this in the browser console when the app is loaded

async function testUniversalChat() {
    console.log('🧪 Testing Universal Chat functionality...');
    
    // Test 1: Check if aiVoiceService is available
    try {
        const aiVoiceService = window.aiVoiceService || 
            (await import('./frontend/src/services/aiVoiceService.ts')).aiVoiceService;
        console.log('✅ aiVoiceService loaded successfully');
        
        // Test 2: Test basic processing (fallback)
        const basicResponse = await aiVoiceService.processWithAI('hello');
        console.log('✅ Basic processing test:', basicResponse);
        
        // Test 3: Test API connection
        const apiResponse = await fetch('https://perfection-v2.onrender.com/api/ai-guidance/process-voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript: 'Hello, this is a test from the frontend',
                timestamp: new Date().toISOString(),
                context: {}
            })
        });
        
        if (apiResponse.ok) {
            const data = await apiResponse.json();
            console.log('✅ API connection test successful:', data);
        } else {
            console.log('❌ API connection failed:', apiResponse.status);
        }
        
        // Test 4: Test different message types
        const testMessages = [
            'hi',
            'create a robotics project',
            'open dashboard',
            'help me with Arduino'
        ];
        
        for (const message of testMessages) {
            console.log(`\n🔍 Testing message: "${message}"`);
            const response = await aiVoiceService.processWithAI(message);
            console.log(`📝 Response:`, response);
        }
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Instructions for manual testing
console.log(`
🧪 Universal Chat Test Instructions:

1. Open the app at http://localhost:3000
2. Press Ctrl+K to open the Universal Chat
3. Try these test messages:
   - "hi" or "hello"
   - "create a robotics project"
   - "open dashboard"
   - "help me with Arduino"
   - "show me components"

4. Check the browser console for detailed logs
5. Verify that responses are helpful and not the old "I heard you but don't know what you need" message

To run automated tests, paste this in the browser console:
testUniversalChat()
`);

// Export for browser use
if (typeof window !== 'undefined') {
    window.testUniversalChat = testUniversalChat;
}