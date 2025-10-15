# mcpez

Minimal, ergonomic ESM wrapper for building MCP servers with TypeScript and Bun.

## Install

```bash
# bun
bun add mcpez

# npm
npm install mcpez

# pnpm
pnpm add mcpez
```

Zod is bundled with mcpez, so you don't need to install it separately.

## Why Zod is Bundled

mcpez bundles Zod v3 to ensure compatibility with the MCP SDK, which requires Zod v3 specifically. Since Zod v4 has breaking changes that cause runtime errors like `keyValidator._parse is not a function`, bundling Zod v3 prevents version conflicts and provides a simpler, error-free developer experience. You can import `z` directly from mcpez:

```ts
import { z, registerPrompt, startServer } from "mcpez"
```

## Quickstart

### Minimal Examples

#### Prompt

<!-- Source: tests/examples/prompt.poem.ts -->

```ts
import { prompt, z } from "mcpez"

prompt(
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
```

#### Tool

<!-- Source: tests/examples/tool.minimal.ts -->

```ts
import { tool, z } from "mcpez"

tool(
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

// No need to manually call startServer(); the server boots on the next tick.
```

#### Resource

<!-- Source: tests/examples/resource.minimal.ts -->

```ts
import { resource } from "mcpez"

resource(
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
```

### Fully Configured Example

<!-- Source: tests/examples/full.server.ts -->

```ts
import { prompt, resource, tool, startServer, z } from "mcpez"

tool(
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

resource(
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

prompt(
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

- `prompt(name, options, handler)`
- `tool(name, options, handler)`
- `resource(name, options)`
- `resourceTemplate(name, options)`
- `startServer(name, serverOptions?, transport?)`

All `register*` calls can be made before `startServer`; they are queued and applied
when the server starts. `startServer` is optional and defaults to `StdioServerTransport`.

## ESM only

This package ships ESM only. Ensure your project has `"type": "module"` or uses
ES module import syntax.

## License

MIT

