import { prompt, resource, tool, startServer, z } from "../../src/index"

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

// Start the server
await startServer("example-echo-server", { version: "1.0.0" })
