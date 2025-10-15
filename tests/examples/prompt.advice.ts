import { z } from "zod"
import { registerPrompt, startServer } from "../../src/index"

registerPrompt(
  "give_advice",
  {
    description: "Provide practical advice for a given situation",
    argsSchema: { situation: z.string().describe("Situation needing advice") },
  },
  async ({ situation }) => ({
    messages: [
      { role: "user", content: { type: "text", text: `Give three tips for: ${situation}` } },
    ],
  }),
)

await startServer("example-server-advice", { version: "1.0.0" })

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
