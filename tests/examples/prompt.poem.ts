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

await startServer()

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
