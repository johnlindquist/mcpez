import { prompt, resource, startServer, tool, z } from "../../src/index"

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

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
