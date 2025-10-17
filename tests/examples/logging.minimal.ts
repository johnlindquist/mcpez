import { getServer, log, notifyToolListChanged, tool } from "../../src/index"

// Register a simple tool
tool("greet", { description: "Greet the user" }, async () => {
  // Send a log message to the client
  log.info("Greeting tool was called")

  return {
    content: [
      {
        type: "text",
        text: "Hello from mcpez!",
      },
    ],
  }
})

// Register another tool that modifies the tool list
tool("add_tool", { description: "Simulate adding a new tool" }, async () => {
  log.info("New tool would be added here")

  // Notify the client that the tool list has changed
  notifyToolListChanged()

  return {
    content: [
      {
        type: "text",
        text: "Tool list changed!",
      },
    ],
  }
})

// Example of using getServer() for advanced operations
const server = getServer()
if (server) {
  log.debug("Server is running, can access advanced APIs")
} else {
  log.debug("Server not started yet, logging is queued")
}
