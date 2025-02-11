import { Genkit } from "genkit";
import { genkitPlugin } from "genkit/plugin";
import { OpenAI } from 'openai';
import {
  deepseekChat,
  deepseekReasoner,
  SUPPORTED_DEEPSEEK_MODELS
} from "./models";
import { deepseekRunner } from "./runner";

export interface PluginOptions {
  apiKey?: string;
  baseURL?: string;
}
export {
  deepseekChat,
  deepseekReasoner
};

/**
 * Initializes the deepseek plugin for Genkit.
 *
 * This function creates a Genkit plugin named "deepseek" which integrates with the OpenAI API.
 * It defines models supported by deepseek and sets up their configurations and runners.
 *
 * @param options - Optional configuration for the plugin, including:
 *  - `apiKey`: The API key for accessing the OpenAI service.
 *  - `baseURL`: The base URL for the OpenAI API.
 *
 * @returns A Genkit plugin instance configured with deepseek models.
 *
 * @module
 * @exports deepseekChat - A function for deepseek chat model.
 * @exports deepseekReasoner - A function for deepseek reasoner model.
 * @exports deepseek - The main function to initialize the deepseek plugin.
 */
export const deepseek = (options?: PluginOptions) =>
  genkitPlugin("deepseek", async (ai: Genkit) => {
    const apiKey = options?.apiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("Deepseek API key is required. Pass plugin options or set DEEPSEEK_API_KEY environment variable.");
    }

    const baseURL = options?.baseURL || process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com';
    
    const client = new OpenAI({apiKey, baseURL});
    for (const name of Object.keys(SUPPORTED_DEEPSEEK_MODELS)) {
      const model = SUPPORTED_DEEPSEEK_MODELS[name];
      ai.defineModel(
        {
          name: model.name,
          ...model.info,
          configSchema: model.configSchema,
        },
        deepseekRunner(name, client)
      );
    }
  });

export default deepseek;
