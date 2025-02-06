/**
 * DeepSeek Runner for Genkit
 *
 * This module converts a Genkit GenerateRequest into a DeepSeek API request,
 * then processes the response into a Genkit GenerateResponseData object.
 * 
 * DeepSeek API documentation:
 *   https://api-docs.deepseek.com/api/create-chat-completion
 */

import { GenerateRequest, GenerateResponseData, Message, Part, StreamingCallback } from 'genkit';
import { GenerateResponseChunkData } from 'genkit/model';
import OpenAI from 'openai';
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { z } from 'zod';
import { DeepSeekConfigSchema, SUPPORTED_DEEPSEEK_MODELS } from './models';
import { removeEmptyKeys } from './utils';

/**
 * DeepSeekCandidateSchema defines the structure of a candidate as returned by DeepSeek.
 * It includes:
 * - index: The candidate index.
 * - finishReason: The finish reason (defaults to "other" if missing).
 * - message: An object containing:
 *     - role: Always "assistant" for DeepSeek responses.
 *     - text: The text content.
 * - custom: Any additional raw response data.
 */
export const DeepSeekCandidateSchema = z.object({
  index: z.number(),
  finishReason: z.string(),
  message: z.object({
    role: z.literal('assistant'),
    text: z.string(),
  }),
  custom: z.any(),
});

export type DeepSeekCandidate = z.infer<typeof DeepSeekCandidateSchema>;

/**
 * Converts a DeepSeek API chunk choice into a DeepSeekCandidate.
 * This function validates the output against the DeepSeekCandidateSchema.
 *
 * @param choice - The DeepSeek API chunk choice.
 * @returns A DeepSeekCandidate object.
 */
export function fromDeepSeekChunkChoice(choice: any): DeepSeekCandidate {
  return DeepSeekCandidateSchema.parse({
    index: choice.index,
    finishReason: choice.finish_reason || 'other',
    message: { role: 'assistant', text: choice.delta.content },
    custom: {},
  });
}

/**
 * Converts a DeepSeek API choice (non-streaming) into a DeepSeekCandidate.
 * This function validates the output against the DeepSeekCandidateSchema.
 *
 * @param choice - The DeepSeek API choice.
 * @returns A DeepSeekCandidate object.
 */
export function fromDeepSeekChoice(choice: any): DeepSeekCandidate {
  return DeepSeekCandidateSchema.parse({
    index: choice.index,
    finishReason: choice.finish_reason || 'other',
    message: { role: 'assistant', text: choice.message.content },
    custom: {},
  });
}

/**
 * Converts Genkit messages to DeepSeek API messages.
 * Each message is reduced to its text content.
 *
 * If a message is of type "function", a default name is assigned.
 */
/**
 * Converts an array of raw message objects into corresponding ChatCompletionMessageParam objects.
 *
 * Each message is processed as follows:
 * - A new Message instance is created for each provided message.
 * - The message role is determined via the toDeepSeekRole function, ensuring it's one
 *   of "system", "assistant", "user", or "function".
 * - For messages with the "function" role, the resulting object includes a "name" property,
 *   defaulting to "function" if no name is provided.
 * - For messages with any other role, the resulting object contains only the role and content.
 *
 * @param messages - The array of raw message objects to be converted.
 * @returns An array of ChatCompletionMessageParam objects formatted for deep seek processing.
 */
function toDeepSeekMessages(messages: any[]): ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    const m = new Message(msg);
    // Assert explicit literal type for roles
    const role = toDeepSeekRole(msg.role) as "system" | "assistant" | "user" | "function";

    if (role === "function") {
      // For function messages, include a required name property.
      return { role, content: m.text, name: msg.name || "function" } as ChatCompletionMessageParam;
    }

    // For other messages, ensure no name property is present.
    return { role, content: m.text } as ChatCompletionMessageParam;
  });
}


/**
 * Converts a standard role string into its DeepSeek-specific role equivalent.
 *
 * This function maps commonly used roles ("system", "assistant", "user", "function")
 * to their corresponding DeepSeek role representations. If the provided role does not
 * match any of the expected values, it is returned unchanged.
 *
 * @param role - The role string to convert.
 * @returns The DeepSeek-specific role string.
 */
function toDeepSeekRole(role: string): string {
  // Example: mapping roles. Adjust as necessary.
  if (role === "system") return "system";
  if (role === "assistant") return "assistant";
  if (role === "user") return "user";
  if (role === "function") return "function";
  return role;
}


/**
 * Converts a given tool object to a DeepSeek tool format.
 *
 * @param tool - The tool object to be converted. It should have at least a `name` property and optionally an `inputSchema` property.
 * @returns An object representing the tool in DeepSeek format, with a `type` of 'function' and a `function` property containing the tool's name and parameters.
 */
function toDeepSeekTool(tool: any): any {
  return {
    type: 'function',
    function: {
      name: tool.name,
      parameters: tool.inputSchema !== null ? tool.inputSchema : undefined,
    },
  };
}


/**
 * Converts a GenerateRequest with DeepSeek configuration and messages into a 
 * ChatCompletionCreateParamsNonStreaming request body for DeepSeek.
 *
 * This function processes the provided messages using the toDeepSeekMessages function and 
 * applies the configuration settings required by DeepSeek's API. It removes any empty keys from 
 * the final request object before returning it. If the configuration is missing in the request, 
 * an error is thrown.
 *
 * @param modelName The name of the DeepSeek model to use.
 * @param request - The generation request containing both the messages and the DeepSeek-specific configuration.
 *                  The configuration must adhere to DeepSeekConfigSchema.
 *
 * @returns A formatted ChatCompletionCreateParamsNonStreaming object tailored for making DeepSeek API calls.
 *
 * @throws {Error} Throws an error if the configuration is not provided in the request.
 */
export function toDeepSeekRequestBody(
  modelName: string,
  request: GenerateRequest<typeof DeepSeekConfigSchema>
): ChatCompletionCreateParamsNonStreaming {
  const model = SUPPORTED_DEEPSEEK_MODELS[modelName];
  if (!model) throw new Error(`Unsupported model: ${modelName}`);

  const config = request.config;
  if (!config) {
    throw new Error('Missing configuration in request');
  }
  
 const body = {
    model: modelName,
    messages: toDeepSeekMessages(request.messages),
    temperature: config.temperature,
    max_tokens: config.maxOutputTokens,
    top_p: config.topP,
    stop: config.stopSequences,
    frequency_penalty: config.frequencyPenalty,
    presence_penalty: config.presencePenalty,
    logprobs: config.logProbs,
    top_logprobs: config.topLogProbs,
    tools: request.tools ? request.tools.map(toDeepSeekTool) : undefined,
    tool_choice: (config as any).tool_choice || "none",
    response_format: { type: "text" }, // DeepSeek only supports text responses
    stream: false, // Will be toggled to true if a streaming callback is provided
    stream_options: null,
  } as ChatCompletionCreateParamsNonStreaming;

  return removeEmptyKeys(body);
}

/**
 * Converts a Genkit Part to a DeepSeek ChatCompletionContentPart.
 *
 * DeepSeek only supports text responses. This function extracts the text content
 * from the Genkit Part and returns an object with type "text" and the text content.
 *
 * @param part - The Genkit Part to convert. Must contain a "text" property.
 * @returns An object with type "text" and the text content.
 * @throws Error if the provided part does not contain a text property.
 */
export function toDeepSeekTextContent(
  part: Part
): { type: 'text'; text: string } {
  if (part.text) {
    return {
      type: 'text',
      text: part.text,
    };
  }
  throw new Error(
    `DeepSeek only supports text parts; received: ${JSON.stringify(part)}.`
  );
}

/**
 * Creates the runner used by Genkit to interact with the DeepSeek model.
 *
 * This runner converts a Genkit GenerateRequest (using DeepSeekConfigSchema)
 * into a DeepSeek API request body and then processes the API response into a
 * Genkit GenerateResponseData object.
 *
 * @param name - The name of the DeepSeek model (e.g. "deepseek-chat" or "deepseek-reasoner").
 * @param client - The OpenAI-compatible client instance configured for DeepSeek.
 * @returns A function that Genkit will call to generate completions.
 */
export function deepseekRunner(name: string, client: OpenAI) {
  return async (
    request: GenerateRequest<typeof DeepSeekConfigSchema>,
    streamingCallback?: StreamingCallback<GenerateResponseChunkData>
  ): Promise<GenerateResponseData> => {
    let response: any;
    // Build the DeepSeek request body.
    const body = toDeepSeekRequestBody(name, request);

    if (streamingCallback) {
      // Enable streaming when a callback is provided.
      const stream = client.beta.chat.completions.stream({
        ...body,
        stream: true,
      });
      for await (const chunk of stream) {
        chunk.choices?.forEach((chunkChoice: any) => {
          const candidate = fromDeepSeekChunkChoice(chunkChoice);
          streamingCallback({
            index: candidate.index,
            content: [{ text: candidate.message.text }],
          });
        });
      }
      response = await stream.finalChatCompletion();
    } else {
      // Standard (non-streaming) request.
      response = await client.chat.completions.create(body);
    }

    // Map the DeepSeek response into Genkit's expected format.
    return {
      candidates: response.choices.map((c: any) => fromDeepSeekChoice(c)),
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
      custom: response,
    };
  };
}
