# VidChat

Chat with any YouTube video using AI. Ask questions and get answers with clickable timestamps.

## Features

- **Transcript-based Q&A** — AI answers questions using the video's captions
- **Clickable timestamps** — Jump to referenced moments in the video
- **Streaming responses** — Real-time response generation
- **Chat persistence** — Conversations saved locally, switchable from menu
- **Model selection** — Choose between GPT-5.2 and GPT-5 Mini

## Setup

```bash
# Install dependencies
npm install

# Create env file with your OpenAI API key
echo "VITE_OPENAI_API_KEY=sk-..." > .env.local

# Build extension
npm run build
```

Load the `build` folder as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## Usage

1. Navigate to any YouTube video
2. Click the extension icon to open the side panel
3. Wait for transcript to load (green indicator)
4. Ask questions about the video

## Architecture

```
src/
├── contentScript/     # Runs on YouTube pages
│   ├── content-script.ts    # Video detection, timestamp seeking
│   └── youtubeTranscript.ts # Transcript extraction via youtube-caption-extractor
├── background/        # Service worker
│   ├── index.ts             # Entry point
│   ├── side-panel.ts        # Panel toggle handling
│   └── transcript-handler.ts # State management between tabs/panel
├── App/VideoChat/     # Side panel UI (React)
│   └── VideoChat.tsx        # Chat interface, history, model selection
└── utils/
    ├── llm.ts               # OpenAI streaming integration
    └── timestampUtils.tsx   # Parse [MM:SS] links in responses
```

### How transcript extraction works

Uses `youtube-caption-extractor` library which fetches captions via YouTube's internal API. Falls back through multiple methods: player API → script tag parsing → window object.

Caption priority: English manual → any manual → English auto-generated → any auto-generated.

## Tech Stack

- **React 18** + **TypeScript**
- **Mantine UI 8** — Component library
- **Vite 7** + **@crxjs/vite-plugin** — Build tooling
- **OpenAI SDK** — Chat completions with streaming
- **Chrome Extension Manifest V3**

## Requirements

- Node.js >= 22
- OpenAI API key

## License

MIT
