import { tool, z } from "../../src/index"

tool(
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

// No need to manually call startServer(); the server boots on the next tick.
