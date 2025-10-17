import type { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js"
import type {
  ReadResourceCallback,
  ReadResourceTemplateCallback,
  ResourceMetadata,
  ResourceTemplate as ResourceTemplateType,
} from "@modelcontextprotocol/sdk/server/mcp.js"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import {
  enqueueRegistration,
  flushRegistrations,
  getServerInstance,
  hasServerStarted,
  setDeferredRegistrationCallback,
  setServerInstance,
} from "./internal/state.js"

let autoStartTimer: ReturnType<typeof setTimeout> | null = null

function cancelPendingAutoStart(): void {
  if (autoStartTimer !== null && typeof clearTimeout === "function") {
    clearTimeout(autoStartTimer)
  }
  autoStartTimer = null
}

function scheduleAutomaticStart(): void {
  if (hasServerStarted() || autoStartTimer !== null) {
    return
  }

  if (typeof setTimeout !== "function") {
    return
  }

  autoStartTimer = setTimeout(() => {
    autoStartTimer = null
    if (!hasServerStarted()) {
      void startServer().catch((error) => {
        const consoleLike = globalThis.console as
          | { error?: (message?: unknown, ...optionalParams: unknown[]) => void }
          | undefined
        consoleLike?.error?.("Failed to automatically start MCP server:", error)
      })
    }
  }, 0)
}

setDeferredRegistrationCallback(scheduleAutomaticStart)

// Re-export useful types to improve DX without forcing consumers to deep-import
export type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
export type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

// LoggingLevel is a union of valid log severity levels per MCP specification
export type LoggingLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical"
  | "alert"
  | "emergency"

// Re-export Zod so users don't need to install it separately
export { z } from "zod"

// Narrowed option types, deferring to SDK types where appropriate
// Derive exact parameter types from the SDK methods
type RegisterPromptParams = Parameters<typeof McpServer.prototype.registerPrompt>
type SDKRegisterPromptOptions = RegisterPromptParams[1]
export type PromptHandler = RegisterPromptParams[2]

// Loosen Zod typing to support both Zod v3 and v4 without type identity issues
export type RegisterPromptOptions = Omit<SDKRegisterPromptOptions, "argsSchema"> & {
  argsSchema?: Record<string, unknown> | unknown
}

type RegisterToolParams = Parameters<typeof McpServer.prototype.registerTool>
type SDKToolOptions = RegisterToolParams[1]
export type ToolHandler = RegisterToolParams[2]

// Loosen Zod typing for tool schemas as well
export type ToolOptions = Omit<SDKToolOptions, "inputSchema" | "outputSchema"> & {
  inputSchema?: Record<string, unknown> | unknown
  outputSchema?: Record<string, unknown> | unknown
}

export type ResourceOptions = ResourceMetadata
export type ResourceReadCallback = ReadResourceCallback
export type ResourceTemplateReadCallback = ReadResourceTemplateCallback

export async function startServer(
  name: string = "mcpez",
  serverOptions?: Record<string, unknown>,
  transport?: StdioServerTransport,
): Promise<void> {
  cancelPendingAutoStart()

  if (hasServerStarted()) {
    throw new Error("MCP server already started. startServer must be called only once.")
  }

  const { version, capabilities, instructions, ...implementationDetails } = serverOptions ?? {}

  const baseCapabilities =
    capabilities && typeof capabilities === "object"
      ? (capabilities as Record<string, unknown>)
      : undefined

  const normalizedCapabilities: Record<string, unknown> = {
    ...(baseCapabilities ?? {}),
  }
  const loggingCapability =
    baseCapabilities &&
      typeof baseCapabilities.logging === "object" &&
      baseCapabilities.logging !== null
      ? (baseCapabilities.logging as Record<string, unknown>)
      : {}
  normalizedCapabilities.logging = loggingCapability

  const server = new McpServer(
    {
      name,
      version: typeof version === "string" ? version : "1.0.0",
      ...implementationDetails,
    },
    {
      capabilities: normalizedCapabilities as ServerOptions["capabilities"],
      instructions: typeof instructions === "string" ? instructions : undefined,
    },
  )

  setServerInstance(server)

  // Ensure any registrations done before start are attached now
  flushRegistrations(server)

  const chosenTransport = transport ?? new StdioServerTransport()
  await server.connect(chosenTransport)
  flushRegistrations(server)

  // Ensure the process stays alive for stdio transports, mirroring SDK behavior in Node
  if (typeof process !== "undefined" && (process as unknown as { stdin?: unknown }).stdin) {
    const stdin = (process as unknown as { stdin?: { resume?: () => void } }).stdin
    stdin?.resume?.()
  }

  // Exit the process when the transport closes (e.g., inspector disconnects)
  const t = chosenTransport as StdioServerTransport & { onclose?: () => void }
  t.onclose = () => {
    if (
      typeof process !== "undefined" &&
      (process as unknown as { exit?: (code?: number) => never }).exit
    ) {
      try {
        // eslint-disable-next-line n/no-process-exit
        ; (process as unknown as { exit: (code?: number) => never }).exit(0)
      } catch { }
    }
  }
}

export function prompt(name: string, options: RegisterPromptOptions, handler: PromptHandler): void {
  const server = getServerInstance()
  if (server) {
    server.registerPrompt(name, options as unknown as SDKRegisterPromptOptions, handler)
    return
  }
  enqueueRegistration({ kind: "prompt", name, options, handler })
}

export function tool(
  // eslint-disable-next-line @typescript-eslint/ban-types
  name: string,
  options: ToolOptions,
  handler: ToolHandler,
): void {
  const server = getServerInstance()
  if (server) {
    server.registerTool(name, options as unknown as SDKToolOptions, handler)
    return
  }
  enqueueRegistration({ kind: "tool", name, options, handler })
}

export function resource(
  name: string,
  uri: string,
  metadata: ResourceOptions,
  readCallback: ResourceReadCallback,
): void
export function resource(
  name: string,
  template: ResourceTemplateType,
  metadata: ResourceOptions,
  readCallback: ResourceTemplateReadCallback,
): void
export function resource(
  name: string,
  uriOrTemplate: string | ResourceTemplateType,
  metadata: ResourceOptions,
  readCallback: ResourceReadCallback | ResourceTemplateReadCallback,
): void {
  const server = getServerInstance()
  if (server) {
    if (typeof uriOrTemplate === "string") {
      server.registerResource(name, uriOrTemplate, metadata, readCallback as ReadResourceCallback)
    } else {
      server.registerResource(
        name,
        uriOrTemplate,
        metadata,
        readCallback as ReadResourceTemplateCallback,
      )
    }
    return
  }
  enqueueRegistration({ kind: "resource", name, uriOrTemplate, metadata, readCallback })
}

export function resourceTemplate(
  name: string,
  template: ResourceTemplateType,
  metadata: ResourceOptions,
  readCallback: ResourceTemplateReadCallback,
): void {
  const server = getServerInstance()
  if (server) {
    server.registerResource(name, template, metadata, readCallback)
    return
  }
  enqueueRegistration({ kind: "resource", name, uriOrTemplate: template, metadata, readCallback })
}

/**
 * Returns the MCP server instance, if it has been started.
 * Useful for advanced operations like sending notifications or accessing the underlying server.
 * @returns The McpServer instance or null if not yet started
 */
export function getServer(): McpServer | null {
  return getServerInstance()
}

type LogMethod = (data: unknown, logger?: string) => void

export type LogApi = Record<LoggingLevel, LogMethod> & {
  emit: (level: LoggingLevel, data: unknown, logger?: string) => void
}

function emitLog(level: LoggingLevel, data: unknown, logger?: string): void {
  const server = getServerInstance()
  if (server) {
    void server.sendLoggingMessage({ level, data, logger })
    return
  }
  enqueueRegistration({ kind: "log", level, data, logger })
}

const logObject: LogApi = {
  emit: emitLog,
  debug: (data, logger) => emitLog("debug", data, logger),
  info: (data, logger) => emitLog("info", data, logger),
  notice: (data, logger) => emitLog("notice", data, logger),
  warning: (data, logger) => emitLog("warning", data, logger),
  error: (data, logger) => emitLog("error", data, logger),
  critical: (data, logger) => emitLog("critical", data, logger),
  alert: (data, logger) => emitLog("alert", data, logger),
  emergency: (data, logger) => emitLog("emergency", data, logger),
}

/**
 * Logging helpers for sending MCP logging notifications.
 * Use `log.info(data)` (or other severity helpers) for convenience, or `log.emit(level, data)` for dynamic levels.
 */
export const log: LogApi = Object.freeze(logObject) as LogApi

/**
 * Notifies the client that the list of resources has changed.
 * If called before the server starts, the notification is queued.
 */
export function notifyResourceListChanged(): void {
  const server = getServerInstance()
  if (server) {
    server.sendResourceListChanged()
    return
  }
  enqueueRegistration({ kind: "resourceListChanged" })
}

/**
 * Notifies the client that the list of tools has changed.
 * If called before the server starts, the notification is queued.
 */
export function notifyToolListChanged(): void {
  const server = getServerInstance()
  if (server) {
    server.sendToolListChanged()
    return
  }
  enqueueRegistration({ kind: "toolListChanged" })
}

/**
 * Notifies the client that the list of prompts has changed.
 * If called before the server starts, the notification is queued.
 */
export function notifyPromptListChanged(): void {
  const server = getServerInstance()
  if (server) {
    server.sendPromptListChanged()
    return
  }
  enqueueRegistration({ kind: "promptListChanged" })
}
