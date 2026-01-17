# VidChat Chrome Extension

Chat with any YouTube video using AI. Ask questions and get answers with clickable timestamps.

## Features

- **Multi-provider AI support** — Choose from OpenAI (GPT-5), Google (Gemini 3), or Anthropic (Claude 4.5)
- **Transcript-based Q&A** — AI answers questions using the video's captions
- **Clickable timestamps** — Jump to referenced moments in the video
- **Streaming responses** — Real-time response generation

## Setup

```bash
# Install dependencies
npm install

# Build extension
npm run build
```

Load the `build` folder as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## Usage

1. Navigate to any YouTube video
2. Click the "Ask AI" button on the video player (or the extension icon)
3. Open Settings and add your API key for at least one provider
4. Wait for transcript to load
5. Ask questions about the video

## Supported Models

| Provider | Models |
|----------|--------|
| OpenAI | GPT-5 Mini, GPT-5.2 |
| Google | Gemini 3 Flash, Gemini 3 Pro |
| Anthropic | Claude Sonnet 4.5, Claude Opus 4.5 |

## Contribution

Feel free to open a PR!

## License

MIT
