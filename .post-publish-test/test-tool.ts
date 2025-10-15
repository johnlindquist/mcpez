import { z, registerTool, startServer } from "mcpez"

registerTool(
    "calculate",
    {
        description: "Perform basic arithmetic operations",
        inputSchema: {
            operation: z.enum(["add", "subtract", "multiply", "divide"]),
            a: z.number().describe("First number"),
            b: z.number().describe("Second number"),
        },
    },
    async ({ operation, a, b }) => {
        let result: number
        switch (operation) {
            case "add":
                result = a + b
                break
            case "subtract":
                result = a - b
                break
            case "multiply":
                result = a * b
                break
            case "divide":
                if (b === 0) {
                    return {
                        content: [{ type: "text", text: "Error: Division by zero" }],
                        isError: true,
                    }
                }
                result = a / b
                break
        }
        return {
            content: [{ type: "text", text: `${a} ${operation} ${b} = ${result}` }],
        }
    },
)

await startServer("post-publish-test-tool", { version: "1.0.0" })

