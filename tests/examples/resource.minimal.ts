import { resource } from "../../src/index"

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

process.exit(0)
