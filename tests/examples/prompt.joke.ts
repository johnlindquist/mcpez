import { z, registerPrompt, startServer } from "../../src/index"

registerPrompt(
  "tell_joke",
  {
    description: "Tell a short, clean joke about a subject",
    argsSchema: { subject: z.string().describe("Subject of the joke") },
  },
  async ({ subject }) => ({
    messages: [
      { role: "user", content: { type: "text", text: `Tell a short joke about ${subject}` } },
    ],
  }),
)

await startServer("example-server-joke", { version: "1.0.0" })

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
