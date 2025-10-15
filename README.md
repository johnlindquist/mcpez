# mcpez

Minimal, ergonomic ESM wrapper for building MCP servers with TypeScript and Bun.

## Install

```bash
bun add mcpez zod
```

## Quickstart

```ts
import { startServer, registerPrompt } from "mcpez";
import { z } from "zod";

registerPrompt(
  "generate_content",
  {
    description: "Generate helpful content based on a topic",
    argsSchema: z.object({ topic: z.string().describe("Topic") }),
  },
  async ({ topic }) => ({
    messages: [
      { role: "user", content: { type: "text", text: `Write a poem about ${topic}` } },
    ],
  })
);

await startServer("my-server-name", { version: "1.0.0" });
```

## API

- `registerPrompt(name, options, handler)`
- `registerTool(name, options, handler)`
- `registerResource(name, options)`
- `registerResourceTemplate(name, options)`
- `startServer(name, serverOptions?, transport?)`

All `register*` calls can be made before `startServer`; they are queued and applied
when the server starts. `startServer` defaults to `StdioServerTransport`.

## ESM only

This package ships ESM only. Ensure your project has `"type": "module"` or uses
ES module import syntax.

## License

MIT

