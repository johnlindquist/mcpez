import { z } from "zod"
import { registerPrompt, registerTool, registerResource, startServer } from "../../src/index"

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

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
