![Firebase Genkit + DeepSeek](https://github.com/oddbit/genkitx-deepseek/raw/main/assets/genkit-deepseek.png)

# Firebase Genkit DeepSeek Plugin

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202%2E0-lightgrey.svg)](https://github.com/TheFireCo/genkit-plugins/blob/main/LICENSE)


**DeepSeek** is a community plugin for using DeepSeek APIs with [Firebase Genkit](https://github.com/firebase/genkit). This plugin provides a simple interface to DeepSeek’s chat and reasoning models through the Genkit plugin system.

> **Note:** This plugin is based on the OpenAI plugin code from [The Fire Company](https://github.com/TheFireCo/genkit-plugins) and is distributed under the [Apache 2.0 License](https://github.com/oddbit/genkitx-deepseek/blob/main/LICENSE).

## Supported Models

- **DeepSeek Chat** – The primary chat model for conversation.
- **DeepSeek Reasoner** – The reasoning model for analytical responses.

## Installation

Install the plugin in your project with your favorite package manager:

```bash
npm install genkitx-deepseek
# or
yarn add genkitx-deepseek
# or
pnpm add genkitx-deepseek
```

## Usage

### Initialization

```typescript
import { genkit } from 'genkit';
import deepseek, { deepseekChat } from 'genkitx-deepseek';

const ai = genkit({
  plugins: [deepseek({ apiKey: process.env.DEEPSEEK_API_KEY })],
  // Optionally specify a default model if not provided in generate params:
  model: deepseekChat,
});
```

### Basic Example

```typescript
const response = await ai.generate({
  model: deepseekChat,
  prompt: 'Tell me joke!',
});

console.log(response.text);
```

## License

This project is licensed under the [Apache 2.0 License](https://github.com/oddbit/genkitx-deepseek/blob/main/LICENSE).
