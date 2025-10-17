import { resourceTemplate } from "../../src/index"

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

process.exit(0)
