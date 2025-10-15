import { z } from "zod"
import { registerTool, startServer } from "../../src/index"

registerTool(
    "get_time",
    {
        description: "Get the current time",
        inputSchema: { format: z.enum(["iso", "unix"]).optional() },
    },
    async ({ format }) => {
        const time = new Date()
        return {
            content: [
                { type: "text", text: format === "unix" ? time.getTime().toString() : time.toISOString() },
            ],
        }
    },
)

await startServer()

// Immediately exit after connect to avoid hanging in tests
process.exit(0)
