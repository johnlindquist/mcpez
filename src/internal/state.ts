import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ResourceOptions, ResourceReadCallback, ResourceTemplateReadCallback } from "../index.js";

type DeferredPrompt = {
    kind: "prompt";
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: any;
};

type DeferredTool = {
    kind: "tool";
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: any;
};

type DeferredResource = {
    kind: "resource";
    name: string;
    uriOrTemplate: string | ResourceTemplate;
    metadata: ResourceOptions;
    readCallback: ResourceReadCallback | ResourceTemplateReadCallback;
};

export type DeferredRegistration =
    | DeferredPrompt
    | DeferredTool
    | DeferredResource;

let serverSingleton: McpServer | null = null;
const deferredRegistrations: DeferredRegistration[] = [];

export function assertServerNotStarted(): void {
    if (serverSingleton) {
        throw new Error("MCP server already started. startServer must be called only once.");
    }
}

export function hasServerStarted(): boolean {
    return serverSingleton !== null;
}

export function setServerInstance(server: McpServer): void {
    serverSingleton = server;
}

export function getServerInstance(): McpServer | null {
    return serverSingleton;
}

export function enqueueRegistration(reg: DeferredRegistration): void {
    deferredRegistrations.push(reg);
}

export function flushRegistrations(target: McpServer): void {
    for (const reg of deferredRegistrations) {
        switch (reg.kind) {
            case "prompt": {
                const { description, argsSchema } = (reg.options || {}) as {
                    description?: string;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    argsSchema?: any;
                };
                if (argsSchema) {
                    if (description) {
                        // name, description, argsSchema, cb
                        target.prompt(reg.name, description as any, argsSchema as any, reg.handler as any);
                    } else {
                        // name, argsSchema, cb
                        target.prompt(reg.name, argsSchema as any, reg.handler as any);
                    }
                } else {
                    if (description) {
                        // name, description, cb
                        target.prompt(reg.name, description as any, reg.handler as any);
                    } else {
                        // name, cb
                        target.prompt(reg.name, reg.handler as any);
                    }
                }
                break;
            }
            case "tool":
                target.registerTool(reg.name, reg.options, reg.handler);
                break;
            case "resource":
                if (typeof reg.uriOrTemplate === "string") {
                    target.registerResource(
                        reg.name,
                        reg.uriOrTemplate,
                        reg.metadata,
                        reg.readCallback as ResourceReadCallback
                    );
                } else {
                    target.registerResource(
                        reg.name,
                        reg.uriOrTemplate,
                        reg.metadata,
                        reg.readCallback as ResourceTemplateReadCallback
                    );
                }
                break;
        }
    }
    deferredRegistrations.length = 0;
}


