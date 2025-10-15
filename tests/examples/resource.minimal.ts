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

await startServer("example-server-resource", { version: "1.0.0" })

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
