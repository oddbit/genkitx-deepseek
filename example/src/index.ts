
import deepseek, {deepseekChat} from 'genkitx-deepseek';
import { genkit } from 'genkit';
import * as dotenv from 'dotenv';

dotenv.config();

// configure a Genkit instance
export default genkit({
  plugins: [deepseek({apiKey: process.env.DEEPSEEK_API_KEY})],
  model: deepseekChat, 
});

(async () => {
  // make a generation request
  const { text } = await ai.generate('Tell me a joke!');
  console.log(text);
})();
