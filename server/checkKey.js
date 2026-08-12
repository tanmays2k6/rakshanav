require('dotenv').config({path:'../.env'});
const key = process.env.GEMINI_API_KEY;
console.log('Key present:', !!key);
console.log('Key prefix:', key ? key.substring(0,6) : 'MISSING');
console.log('Key length:', key ? key.length : 0);
console.log('Looks like real Gemini key (starts with AIza):', key ? key.startsWith('AIza') : false);
