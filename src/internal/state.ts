import type { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"
import type {
  PromptHandler,
  RegisterPromptOptions,
  ResourceOptions,
  ResourceReadCallback,
  ResourceTemplateReadCallback,
  ToolHandler,
  ToolOptions,
} from "../index.js"

type DeferredPrompt = {
  kind: "prompt"
  name: string
  options: RegisterPromptOptions
  handler: PromptHandler
}

type DeferredTool = {
  kind: "tool"
  name: string
  options: ToolOptions
  handler: ToolHandler
}

type DeferredResource = {
  kind: "resource"
  name: string
  uriOrTemplate: string | ResourceTemplate
  metadata: ResourceOptions
  readCallback: ResourceReadCallback | ResourceTemplateReadCallback
}

export type DeferredRegistration = DeferredPrompt | DeferredTool | DeferredResource

let serverSingleton: McpServer | null = null
const deferredRegistrations: DeferredRegistration[] = []

export function assertServerNotStarted(): void {
  if (serverSingleton) {
    throw new Error("MCP server already started. startServer must be called only once.")
  }
}

export function hasServerStarted(): boolean {
  return serverSingleton !== null
}

export function setServerInstance(server: McpServer): void {
  serverSingleton = server
}

export function getServerInstance(): McpServer | null {
  return serverSingleton
}

export function enqueueRegistration(reg: DeferredRegistration): void {
  deferredRegistrations.push(reg)
}

export function flushRegistrations(target: McpServer): void {
  for (const reg of deferredRegistrations) {
    switch (reg.kind) {
      case "prompt": {
        target.registerPrompt(reg.name, reg.options, reg.handler)
        break
      }
      case "tool":
        target.registerTool(reg.name, reg.options, reg.handler)
        break
      case "resource":
        if (typeof reg.uriOrTemplate === "string") {
          target.registerResource(
            reg.name,
            reg.uriOrTemplate,
            reg.metadata,
            reg.readCallback as ResourceReadCallback,
          )
        } else {
          target.registerResource(
            reg.name,
            reg.uriOrTemplate,
            reg.metadata,
            reg.readCallback as ResourceTemplateReadCallback,
          )
        }
        break
    }
  }
  deferredRegistrations.length = 0
}
