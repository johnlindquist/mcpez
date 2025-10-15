import { registerResource, startServer } from "../../src/index"

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

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
