# VidChat

Chat with any YouTube video using AI. Ask questions and get answers with clickable timestamps.

## Features

- **Multi-provider AI support** — Choose from OpenAI (GPT-5), Google (Gemini 3), or Anthropic (Claude 4.5)
- **Transcript-based Q&A** — AI answers questions using the video's captions
- **Clickable timestamps** — Jump to referenced moments in the video
- **Streaming responses** — Real-time response generation
- **Chat persistence** — Conversations saved locally, switchable from menu
- **Model selection** — Switch between models from any supported provider

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

## Architecture

```
src/
├── contentScript/     # Runs on YouTube pages
│   ├── content-script.ts    # Video detection, button injection, timestamp seeking
│   └── youtubeTranscript.ts # Transcript extraction via youtube-caption-extractor
├── background/        # Service worker
│   ├── index.ts             # Entry point
│   ├── side-panel.ts        # Panel toggle handling
│   └── transcript-handler.ts # State management between tabs/panel
├── App/               # Side panel UI (React)
│   ├── VideoChat/           # Chat interface, history, model selection
│   └── Settings/            # API key management
└── utils/
    ├── llm.ts               # Multi-provider LLM streaming integration
    ├── localStorage.ts      # Chrome storage wrapper, API key storage
    └── timestampUtils.tsx   # Parse [MM:SS] links in responses
```

### How transcript extraction works

Uses `youtube-caption-extractor` library which fetches captions via YouTube's internal API. Falls back through multiple methods: player API → script tag parsing → window object.

Caption priority: English manual → any manual → English auto-generated → any auto-generated.

## Tech Stack

- **React 18** + **TypeScript**
- **Mantine UI 8** — Component library
- **Vite 7** + **@crxjs/vite-plugin** — Build tooling
- **OpenAI SDK**, **Google Generative AI SDK**, **Anthropic SDK** — LLM providers
- **Chrome Extension Manifest V3**

## Requirements

- Node.js >= 22
- API key for at least one provider (OpenAI, Google, or Anthropic)

## License

MIT
