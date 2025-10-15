import { prompt, z } from "../../src/index"

prompt(
  "review-code",
  {
    description: "Review code for best practices and potential issues",
    argsSchema: {
      code: z.string(),
    },
  },
  ({ code }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please review this code:\n\n${code}`,
        },
      },
    ],
  }),
)

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
