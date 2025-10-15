import { z } from "zod"
import { registerTool, startServer } from "../../src/index"

registerTool(
    "add",
    {
        description: "Add two numbers",
        inputSchema: {
            a: z.number(),
            b: z.number(),
        },
    },
    async ({ a, b }) => {
        const result = a + b
        return {
            content: [{ type: "text", text: `${a} + ${b} = ${result}` }],
        }
    },
)

await startServer()

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
