# mcpez

Minimal, ergonomic ESM wrapper for building MCP servers with TypeScript and Bun.

## Install

```bash
bun add mcpez zod
```

## Quickstart

### Minimal Examples

#### Prompt

<!-- Source: tests/examples/prompt.poem.ts -->

```ts
import { z } from "zod"
import { registerPrompt, startServer } from "mcpez"

registerPrompt(
  "generate_content",
  {
    description: "Generate helpful content based on a topic",
    argsSchema: { topic: z.string().describe("Topic") },
  },
  async ({ topic }) => ({
    messages: [{ role: "user", content: { type: "text", text: `Write a poem about ${topic}` } }],
  }),
)

await startServer("example-server-poem", { version: "1.0.0" })
```

#### Tool

<!-- Source: tests/examples/tool.minimal.ts -->

```ts
import { z } from "zod"
import { registerTool, startServer } from "mcpez"

registerTool(
    "get_time",
    {
        description: "Get the current time",
        inputSchema: { format: z.enum(["iso", "unix"]).optional() },
    },
    async ({ format }) => {
        const time = new Date()
        return {
            content: [
                { type: "text", text: format === "unix" ? time.getTime().toString() : time.toISOString() },
            ],
        }
    },
)

await startServer("example-server-tool", { version: "1.0.0" })
```

#### Resource

<!-- Source: tests/examples/resource.minimal.ts -->

```ts
import { registerResource, startServer } from "mcpez"

registerResource(
    "config",
    "file:///config.json",
    { mimeType: "application/json" },
    async () => ({
        contents: [
            { uri: "file:///config.json", mimeType: "application/json", text: '{"setting": "value"}' },
        ],
    }),
)

await startServer("example-server-resource", { version: "1.0.0" })
```

### Fully Configured Example

<!-- Source: tests/examples/full.server.ts -->

```ts
import { z } from "zod"
import { registerPrompt, registerTool, registerResource, startServer } from "mcpez"

// Register a prompt
registerPrompt(
    "generate_content",
    {
        description: "Generate helpful content based on a topic",
        argsSchema: { topic: z.string().describe("Topic") },
    },
    async ({ topic }) => ({
        messages: [
            { role: "user", content: { type: "text", text: `Write a poem about ${topic}` } },
        ],
    }),
)

// Register a tool
registerTool(
    "get_time",
    {
        description: "Get the current time",
        inputSchema: { format: z.enum(["iso", "unix"]).optional() },
    },
    async ({ format }) => {
        const time = new Date()
        return {
            content: [
                { type: "text", text: format === "unix" ? time.getTime().toString() : time.toISOString() },
            ],
        }
    },
)

// Register a resource
registerResource(
    "config",
    "file:///config.json",
    { mimeType: "application/json" },
    async () => ({
        contents: [
            { uri: "file:///config.json", mimeType: "application/json", text: '{"setting": "value"}' },
        ],
    }),
)

// Start with custom server name and version
await startServer("example-full-server", { version: "1.0.0" })
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

