# mcpez

Minimal, ergonomic ESM wrapper for building MCP servers with TypeScript and Bun.

<img src="./mcpez.png" alt="mcpez" style="max-height: 400px;" />

## Install

```bash
bun add mcpez
```

## Quickstart

### Minimal Examples

#### Prompt

<!-- Source: tests/examples/prompt.poem.ts -->

```ts
import { prompt, z } from "mcpez"

prompt(
  "review-code",
  {
    description: "Review code for best practices and potential issues",
    argsSchema: {
      code: z.string(),
    },
  },
  ({ code }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please review this code:\n\n${code}`,
        },
      },
    ],
  }),
)
```

> **Note**: Zod is bundled with mcpez, so you don't need to install it separately.

## Why Zod is Bundled

mcpez bundles Zod v3 to ensure compatibility with the MCP SDK, which requires Zod v3 specifically. Since Zod v4 has breaking changes that cause runtime errors like `keyValidator._parse is not a function`, bundling Zod v3 prevents version conflicts and provides a simpler, error-free developer experience. You can import `z` directly from mcpez:

#### Tool

<!-- Source: tests/examples/tool.minimal.ts -->

```ts
import { tool, z } from "mcpez"

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
```

#### Resource

<!-- Source: tests/examples/resource.minimal.ts -->

```ts
import { resource } from "mcpez"

type EnvironmentConfig = {
  settings: {
    databaseUrl: string
    featureFlags: Record<string, boolean>
  }
  secrets: {
    apiKey: string
  }
}

// In-memory configuration data keyed by deployment environment.
const environmentConfigs = new Map<string, EnvironmentConfig>([
  [
    "production",
    {
      settings: {
        databaseUrl: "postgresql://prod.db.internal/app",
        featureFlags: {
          betaDashboard: false,
          useV2Search: true,
        },
      },
      secrets: {
        apiKey: "prod-12345",
      },
    },
  ],
  [
    "staging",
    {
      settings: {
        databaseUrl: "postgresql://staging.db.internal/app",
        featureFlags: {
          betaDashboard: true,
          useV2Search: true,
        },
      },
      secrets: {
        apiKey: "staging-67890",
      },
    },
  ],
  [
    "development",
    {
      settings: {
        databaseUrl: "postgresql://localhost:5432/app",
        featureFlags: {
          betaDashboard: true,
          useV2Search: false,
        },
      },
      secrets: {
        apiKey: "dev-abcde",
      },
    },
  ],
])

resource(
  "environment-config",
  "config://environment",
  {
    description: "Environment-specific configuration values with optional secrets.",
    mimeType: "application/json",
  },
  async (uri) => {
    const params = uri.searchParams
    const environment = params.get("env") ?? "production"

    const config = environmentConfigs.get(environment)
    if (!config) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                error: `Unknown environment: ${environment}`,
                availableEnvironments: Array.from(environmentConfigs.keys()),
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    const includeSecrets = params.get("secrets") === "true"

    const payload = {
      environment,
      settings: config.settings,
      ...(includeSecrets ? { secrets: config.secrets } : {}),
      generatedAt: new Date().toISOString(),
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(payload, null, 2),
        },
      ],
    }
  },
)
```

#### Resource Template

<!-- Source: tests/examples/resourceTemplate.logs.ts -->

```ts
import { resourceTemplate } from "mcpez"

type LogLevel = "info" | "warning" | "error"
type LogEntry = {
  timestamp: string
  message: string
  context?: Record<string, unknown>
}

// Structured audit logs keyed by ISO date and severity level.
const auditLogStore: Record<string, Record<LogLevel, LogEntry[]>> = {
  "2024-04-01": {
    info: [
      { timestamp: "2024-04-01T08:00:00Z", message: "Deployment pipeline triggered" },
      { timestamp: "2024-04-01T08:05:12Z", message: "Deployment completed successfully" },
    ],
    warning: [
      {
        timestamp: "2024-04-01T09:12:33Z",
        message: "Retrying connection to Redis leader",
        context: { attempts: 2 },
      },
    ],
    error: [
      {
        timestamp: "2024-04-01T09:15:00Z",
        message: "Payment gateway timeout",
        context: { orderId: "ORD-481516" },
      },
    ],
  },
  "2024-04-02": {
    info: [
      { timestamp: "2024-04-02T07:45:00Z", message: "Background sync completed" },
      { timestamp: "2024-04-02T10:30:00Z", message: "New feature flag enabled" },
    ],
    warning: [
      {
        timestamp: "2024-04-02T11:05:48Z",
        message: "Slow database query detected",
        context: { durationMs: 830, query: "SELECT * FROM invoices" },
      },
    ],
    error: [],
  },
}

const strictLevels: LogLevel[] = ["info", "warning", "error"]

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

resourceTemplate(
  "audit-log",
  {
    name: "audit-log",
    title: "Audit log by date and level",
    uriTemplate: "audit-log://{date}/{level}",
    description: "Retrieve stored audit log entries filtered by ISO date and severity level.",
  },
  {
    description: "Audit log entries grouped by date and severity level.",
    mimeType: "application/json",
  },
  async (uri, variables) => {
    const typedVariables = variables as Record<string, string | string[] | undefined>
    const date = firstValue(typedVariables.date)
    const level = firstValue(typedVariables.level)

    if (!date || !level) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                error: "Both {date} and {level} must be provided in the URI template.",
                expectedUri: "audit-log://2024-04-01/error",
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    const normalizedLevel = level.toLowerCase()
    if (!strictLevels.includes(normalizedLevel as LogLevel)) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                error: `Unsupported log level: ${level}`,
                supportedLevels: strictLevels,
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    const entriesByLevel = auditLogStore[date]
    if (!entriesByLevel) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                error: `No logs found for ${date}.`,
                availableDates: Object.keys(auditLogStore),
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    const entries = entriesByLevel[normalizedLevel as LogLevel]

    if (!entries || entries.length === 0) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                message: `No ${normalizedLevel} logs found for ${date}.`,
                availableLevels: strictLevels.filter((item) => entriesByLevel[item].length > 0),
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              date,
              level: normalizedLevel,
              count: entries.length,
              entries,
            },
            null,
            2,
          ),
        },
      ],
    }
  },
)
```

#### Logging and Notifications

<!-- Source: tests/examples/logging.minimal.ts -->

```ts
import { getServer, log, notifyToolListChanged, tool } from "mcpez"

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
```

### Fully Configured Example

<!-- Source: tests/examples/full.server.ts -->

```ts
import { prompt, resource, startServer, tool, z } from "mcpez"

tool(
  "echo",
  {
    description: "Echoes back the provided message",
    inputSchema: { message: z.string() },
  },
  async ({ message }) => {
    const output = { echo: `Tool echo: ${message}` }
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
    }
  },
)

resource(
  "echo",
  "echo://message",
  {
    description: "Echoes back messages as resources",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: `Resource echo: Hello!`,
      },
    ],
  }),
)

prompt(
  "echo",
  {
    description: "Creates a prompt to process a message",
    argsSchema: { message: z.string() },
  },
  ({ message }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please process this message: ${message}`,
        },
      },
    ],
  }),
)

// Start with custom server name and version
await startServer("example-full-server", { version: "1.0.0" })
```

## API

- `prompt(name, options, handler)`
- `tool(name, options, handler)`
- `resource(name, options)`
- `resourceTemplate(name, options)`
- `startServer(name, serverOptions?, transport?)`
- `getServer()` - Get the running server instance
- `log.info(data, logger?)` - Send a logging message (other helpers: `debug`, `notice`, `warning`, `error`, `critical`, `alert`, `emergency`)
- `notifyResourceListChanged()` - Notify when resources change
- `notifyToolListChanged()` - Notify when tools change
- `notifyPromptListChanged()` - Notify when prompts change

All `register*` calls can be made before `startServer`; they are queued and applied
when the server starts. `startServer` is optional and defaults to `StdioServerTransport`.

## ESM only

This package ships ESM only. Ensure your project has `"type": "module"` or uses
ES module import syntax.

## License

MIT
