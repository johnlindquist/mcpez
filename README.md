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
  "review-code",
  {
    description: "Review code for best practices and potential issues",
    argsSchema: {
      code: z.string(),
    },
  },
  ({ code }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please review this code:\n\n${code}`,
        },
      },
    ],
  }),
)

await startServer()
```

#### Tool

<!-- Source: tests/examples/tool.minimal.ts -->

```ts
import { z } from "zod"
import { registerTool, startServer } from "mcpez"

registerTool(
  "add",
  {
    description: "Add two numbers",
    inputSchema: {
      a: z.number(),
      b: z.number(),
    },
  },
  async ({ a, b }) => {
    const result = a + b
    return {
      content: [{ type: "text", text: `${a} + ${b} = ${result}` }],
    }
  },
)

await startServer()
```

#### Resource

<!-- Source: tests/examples/resource.minimal.ts -->

```ts
import { registerResource, startServer } from "mcpez"

registerResource(
  "config",
  "config://app",
  {
    description: "Application configuration data",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: "App configuration here",
      },
    ],
  }),
)

await startServer()
```

### Fully Configured Example

<!-- Source: tests/examples/full.server.ts -->

```ts
import { z } from "zod"
import { registerPrompt, registerTool, registerResource, startServer } from "mcpez"

registerTool(
  "echo",
  {
    description: "Echoes back the provided message",
    inputSchema: { message: z.string() },
  },
  async ({ message }) => {
    const output = { echo: `Tool echo: ${message}` }
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
    }
  },
)

registerResource(
  "echo",
  "echo://message",
  {
    description: "Echoes back messages as resources",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: `Resource echo: Hello!`,
      },
    ],
  }),
)

registerPrompt(
  "echo",
  {
    description: "Creates a prompt to process a message",
    argsSchema: { message: z.string() },
  },
  ({ message }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please process this message: ${message}`,
        },
      },
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

