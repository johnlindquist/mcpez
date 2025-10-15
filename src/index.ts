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
    setServerInstance,
} from "./internal/state.js"

// Re-export useful types to improve DX without forcing consumers to deep-import
export type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
export type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

// Re-export Zod so users don't need to install it separately
export { z } from "zod"

// Narrowed option types, deferring to SDK types where appropriate
// Derive exact parameter types from the SDK methods
type RegisterPromptParams = Parameters<typeof McpServer.prototype.registerPrompt>
type SDKRegisterPromptOptions = RegisterPromptParams[1]
export type PromptHandler = RegisterPromptParams[2]

// Loosen Zod typing to support both Zod v3 and v4 without type identity issues
export type RegisterPromptOptions = Omit<SDKRegisterPromptOptions, "argsSchema"> & {
    argsSchema: Record<string, unknown> | unknown
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
    if (hasServerStarted()) {
        throw new Error("MCP server already started. startServer must be called only once.")
    }

    const server = new McpServer({
        name,
        version: (serverOptions?.version as string | undefined) ?? "1.0.0",
        ...(serverOptions ?? {}),
    })

    setServerInstance(server)

    // Ensure any registrations done before start are attached now
    flushRegistrations(server)

    const chosenTransport = transport ?? new StdioServerTransport()
    await server.connect(chosenTransport)

    // Ensure the process stays alive for stdio transports, mirroring SDK behavior in Node
    if (typeof process !== "undefined" && (process as unknown as { stdin?: unknown }).stdin) {
        const stdin = (process as unknown as { stdin?: { resume?: () => void } }).stdin
        stdin?.resume?.()
    }

    // Exit the process when the transport closes (e.g., inspector disconnects)
    const t = chosenTransport as StdioServerTransport & { onclose?: () => void }
    t.onclose = () => {
        if (typeof process !== "undefined" && (process as unknown as { exit?: (code?: number) => never }).exit) {
            try {
                // eslint-disable-next-line n/no-process-exit
                ; (process as unknown as { exit: (code?: number) => never }).exit(0)
            } catch { }
        }
    }
}

export function registerPrompt(
    name: string,
    options: RegisterPromptOptions,
    handler: PromptHandler,
): void {
    const server = getServerInstance()
    if (server) {
        server.registerPrompt(name, options as unknown as SDKRegisterPromptOptions, handler)
        return
    }
    enqueueRegistration({ kind: "prompt", name, options, handler })
}

export function registerTool(
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

export function registerResource(
    name: string,
    uri: string,
    metadata: ResourceOptions,
    readCallback: ResourceReadCallback,
): void
export function registerResource(
    name: string,
    template: ResourceTemplateType,
    metadata: ResourceOptions,
    readCallback: ResourceTemplateReadCallback,
): void
export function registerResource(
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

export function registerResourceTemplate(
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
