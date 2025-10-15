import { resource } from "../../src/index"

resource(
  "config",
  "config://app",
  {
    description: "Application configuration data",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: "App configuration here",
      },
    ],
  }),
)

process.exit(0)
