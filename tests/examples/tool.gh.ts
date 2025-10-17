import { tool, z } from "../../src/index"

tool(
  "create-issue",
  {
    description: "Create an issue on the repository",
    inputSchema: {
      title: z.string().describe("The title of the issue"),
      body: z.string().describe("The body of the issue"),
    },
  },
  async ({ title, body }) => {
    try {
      const status = await Bun.$`gh issue create --title ${title} --body ${body}`.text()
      console.error(status)
      // open the issue in the browser
      await Bun.$`gh issue view --web`
      return {
        content: [
          {
            type: "text",
            text: status,
          },
        ],
      }
    } catch (error) {
      console.error(error)
      return {
        content: [
          {
            type: "text",
            text: `Error: ${(error as Error).message}`,
          },
        ],
      }
    }
  },
)
