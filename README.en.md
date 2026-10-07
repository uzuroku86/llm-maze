# llm-maze

[日本語](README.md) | English

An experimental app that turns a conversation with an LLM into a 3D space you can walk through, instead of a chat log.

When you enter a question, the LLM's answer unfolds in front of you as rooms and paths. You walk through the space, keep asking from wherever you stand, and look for a conclusion you can agree with.

For the concept and development policy, see [docs/CONCEPT.md](docs/CONCEPT.md), [docs/MVP.md](docs/MVP.md), and [CLAUDE.md](CLAUDE.md). These documents are written in Japanese.

## How to play

1. On startup, you are in a round room with an input box. Type what you want to think through and press Enter.
2. The issue and the LLM's tentative answer appear above the room. Each path leads to a room showing one view and its reasoning.
3. Click the screen to start walking. Walk to the end of a path that interests you.
4. In that room, press Enter and type what you want to think about next. New paths grow from that room. The question you entered stays at the entrance of those paths as a sign.
5. To go back, turn around and walk back along the path you came from.

| Action | Key |
| --- | --- |
| Move | WASD / arrow keys |
| Look around | Mouse |
| Start mouse look | Click the screen |
| Release mouse look | ESC |
| Ask a question | Enter (or the "相談する" button at the top right) |

While you are on a path, WASD / arrow keys move you along the path's axis. You stay on the path even if the mouse direction is slightly off.

## Getting started

Tested with Node.js 24 and npm 11. You need an OpenAI API key.

```bash
npm install
cp .env.example .env
```

Set your OpenAI API key in `.env`.

```bash
OPENAI_API_KEY=sk-...
```

Start the dev server.

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the build output |

The API proxy runs only on the Vite dev server, so asking questions does not work with `npm run preview`.

## How it works

- The browser sends each question to `/api/think`. This endpoint is a proxy provided by the Vite dev server ([server/thinkApi.ts](server/thinkApi.ts)), which calls the OpenAI API on the server side. The API key is never sent to the browser.
- The model is `gpt-4.1-mini`. The LLM outputs one JSON object per line, and each line is added to the space as soon as it is received.
- The first question returns the issue, a tentative answer, and a set of views. Later questions send the chain of thoughts from the first issue to your current room together with your new question, and return one to three views.
- The layout of the thought tree into rooms and paths lives in [src/layout.ts](src/layout.ts). Once a room is placed, it never moves.

### Structure

```text
server/thinkApi.ts   Proxy to the OpenAI API and the prompts
src/App.tsx          UI, question input, updating the thought tree
src/think.ts         Receiving the streamed response from the proxy
src/layout.ts        Placing rooms and paths, deciding where you can walk
src/World.tsx        Rendering rooms, paths, text, and animations
src/Player.tsx       Movement with WASD / arrow keys
src/thoughtGraph.ts  Type of a thought node
```

Built with TypeScript, React, React Three Fiber, and Vite.

## Limitations

- There is no save feature. Reloading the page discards the space.
- A room can have at most five paths.
- If you dig deeply into two neighboring branches, rooms can overlap from the third level down.
