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

type DeferredLog = {
  kind: "log"
  level: string
  message?: string
  logger?: string
  data: unknown
}

type DeferredNotification =
  | {
      kind: "resourceListChanged"
    }
  | {
      kind: "toolListChanged"
    }
  | {
      kind: "promptListChanged"
    }

export type DeferredRegistration =
  | DeferredPrompt
  | DeferredTool
  | DeferredResource
  | DeferredLog
  | DeferredNotification

let serverSingleton: McpServer | null = null
const deferredRegistrations: DeferredRegistration[] = []
let deferredRegistrationCallback: (() => void) | null = null

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

export function setDeferredRegistrationCallback(callback: (() => void) | null): void {
  deferredRegistrationCallback = callback
}

export function enqueueRegistration(reg: DeferredRegistration): void {
  deferredRegistrations.push(reg)
  deferredRegistrationCallback?.()
}

export function flushRegistrations(target: McpServer): void {
  const remaining: DeferredRegistration[] = []
  const queued = deferredRegistrations.splice(0)
  for (const reg of queued) {
    switch (reg.kind) {
      case "prompt": {
        target.registerPrompt(
          reg.name,
          reg.options as unknown as Parameters<McpServer["registerPrompt"]>[1],
          reg.handler,
        )
        break
      }
      case "tool":
        target.registerTool(
          reg.name,
          reg.options as unknown as Parameters<McpServer["registerTool"]>[1],
          reg.handler,
        )
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
      case "log": {
        if (target.isConnected()) {
          void target.sendLoggingMessage({
            level: reg.level as Parameters<typeof target.sendLoggingMessage>[0]["level"],
            logger: reg.logger,
            data: reg.data,
          })
        } else {
          remaining.push(reg)
        }
        break
      }
      case "resourceListChanged":
        target.sendResourceListChanged()
        break
      case "toolListChanged":
        target.sendToolListChanged()
        break
      case "promptListChanged":
        target.sendPromptListChanged()
        break
    }
  }
  if (remaining.length > 0) {
    deferredRegistrations.push(...remaining)
  }
}
