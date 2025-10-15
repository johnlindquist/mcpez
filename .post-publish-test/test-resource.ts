import { resource, startServer } from "mcpez"

resource(
  "greeting",
  "greeting://hello",
  {
    description: "A simple greeting resource",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "text/plain",
        text: "Hello from the post-publish test!",
      },
    ],
  }),
)

await startServer("post-publish-test-resource", { version: "1.0.0" })

