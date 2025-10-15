import { z } from "zod"
import { registerPrompt, registerTool, registerResource, startServer } from "../../src/index"

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

// Start the server
await startServer("example-echo-server", { version: "1.0.0" })
