import { z } from "zod"
import { registerPrompt, startServer } from "../../src/index"

registerPrompt(
  "generate_content",
  {
    description: "Generate helpful content based on a topic",
    argsSchema: { topic: z.string().describe("Topic") },
  },
  async ({ topic }) => ({
    messages: [{ role: "user", content: { type: "text", text: `Write a poem about ${topic}` } }],
  }),
)

await startServer("example-server-inspect", { version: "1.0.0" })

// Keep the process alive to allow inspector to connect via stdio
setInterval(() => {}, 1 << 30)
