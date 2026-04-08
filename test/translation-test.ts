import translationService from '../src/services/translationService';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Testing translation to DeepL...');
  if (!process.env.DEEPL_API_KEY) {
    console.warn('[Warning] Missing DEEPL_API_KEY in .env, falling back locally.');
  }

  try {
    const txt = await translationService.translateText('Hello world, how are you?', 'en-US', 'pt-BR');
    console.log('Result:', txt);
    process.exit(0);
  } catch(e) {
    console.error('Test Failed:', e);
    process.exit(1);
  }
}
run();
