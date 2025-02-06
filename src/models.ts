/**
 * This file defines the models that are available in the DeepSeek plugin.
 *
 * @see [DeepSeek Create Chat Completion API](https://api-docs.deepseek.com/api/create-chat-completion)
 * @see [DeepSeek Reasoning Model](https://api-docs.deepseek.com/guides/reasoning_model)
 */
import { GenerationCommonConfigSchema, ModelReference } from 'genkit';
import { modelRef } from 'genkit/model';
import { z } from 'zod';

export const DeepSeekConfigSchema = GenerationCommonConfigSchema.extend({
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  logProbs: z.boolean().optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  seed: z.number().int().optional(),
  topLogProbs: z.number().int().min(0).max(20).optional(),
  user: z.string().optional(),
});

export const deepseekChat = modelRef({
  name: "deepseek/deepseek-chat",
  info: {
    label: "DeepSeek - Chat",
    supports: {
      media: false,
      output: ["text"],
      multiturn: true,
      systemRole: true,
      tools: false,
    },
  },
  configSchema: DeepSeekConfigSchema,
});

export const deepseekReasoner = modelRef({
  name: "deepseek/deepseek-reasoner",
  info: {
    label: "DeepSeek - Reasoner",
    supports: {
      media: false,
      output: ["text"],
      multiturn: true,
      systemRole: true,
      tools: false,
    },
  },
  configSchema: DeepSeekConfigSchema,
});


export const SUPPORTED_DEEPSEEK_MODELS: Record<
  string,
  ModelReference<typeof DeepSeekConfigSchema>
> = {
  'deepseek-chat': deepseekChat,
  'deepseek-reasoner': deepseekReasoner,
};
