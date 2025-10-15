#!/usr/bin/env bun

/**
 * Verify that our zod version matches the MCP SDK's zod version
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

const rootDir = new URL("../", import.meta.url).pathname

// Read our package.json
const ourPkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf-8"))

// Read MCP SDK's package.json
const sdkPkg = JSON.parse(
    readFileSync(join(rootDir, "node_modules/@modelcontextprotocol/sdk/package.json"), "utf-8"),
)

const ourZodVersion = ourPkg.dependencies.zod
const sdkZodVersion = sdkPkg.dependencies.zod

console.log(`📦 Our zod version:     ${ourZodVersion}`)
console.log(`📦 MCP SDK zod version: ${sdkZodVersion}`)

if (ourZodVersion !== sdkZodVersion) {
    console.error("\n❌ ERROR: Zod version mismatch!")
    console.error(`   Update package.json dependencies.zod to: "${sdkZodVersion}"`)
    console.error(`   Also update resolutions.zod and overrides.zod to match.`)
    process.exit(1)
}

console.log("\n✅ Zod versions match!")

