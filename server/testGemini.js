require('dotenv').config({path:'../.env'});
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const key = process.env.GEMINI_API_KEY;
  console.log('Key prefix:', key ? key.substring(0,8) : 'MISSING');
  
  if (!key || !key.startsWith('AIza')) {
    console.log('\n❌ PROBLEM: API key is not a valid Google AI Studio key.');
    console.log('   Real Gemini keys start with "AIza".');
    console.log('   Get one at: https://aistudio.google.com/apikey');
    return;
  }
  
  const genAI = new GoogleGenerativeAI(key);
  
  // Test correct model names
  const modelsToTest = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "hello" in one word.');
      const text = result.response.text();
      console.log(`✅ Model "${modelName}" works: ${text.trim()}`);
      break;
    } catch (err) {
      console.log(`❌ Model "${modelName}" failed:`, err.message.substring(0, 100));
    }
  }
}

test().catch(console.error);
