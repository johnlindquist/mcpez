import { prompt, startServer, z } from "../../src/index"

prompt(
    "review-code",
    {
        description: "Review code and provide feedback",
        argsSchema: { subject: z.string().describe("Code to review") },
    },
    async ({ subject }) => ({
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Please review this code:\n\n${subject}\n\nProvide feedback on style, performance, and best practices.`,
                },
            },
        ],
    }),
)

await startServer("code-reviewer", { version: "1.0.0" })
