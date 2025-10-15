import { registerResource, startServer } from "../../src/index"

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

await startServer()

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
