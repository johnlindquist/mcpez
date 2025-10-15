#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

const repoRoot = new URL("..", import.meta.url).pathname
const readmePath = join(repoRoot, "README.md")
const readme = readFileSync(readmePath, "utf-8")

// Pattern: <!-- Source: path/to/file.ts -->
// Followed by a code block that should be replaced with the file content
const pattern = /<!-- Source: (.*?) -->\n\n```ts\n[\s\S]*?\n```/g

let updated = readme

for (const match of readme.matchAll(pattern)) {
    const sourceFile = match[1]
    const filePath = join(repoRoot, sourceFile)

    try {
        const content = readFileSync(filePath, "utf-8").trim()

        // Remove the process.exit(0) lines for README examples (they're test-specific)
        const lines = content.split("\n")
        const cleanedLines = lines.filter(
            (line) => !line.includes("process.exit") && !line.includes("Immediately exit")
        )
        let cleanedContent = cleanedLines.join("\n").trim()

        // Replace internal import paths with public API for README
        cleanedContent = cleanedContent.replace(/from ["']\.\.\/\.\.\/src\/index["']/g, 'from "mcpez"')

        const newBlock = `<!-- Source: ${sourceFile} -->\n\n\`\`\`ts\n${cleanedContent}\n\`\`\``
        updated = updated.replace(match[0], newBlock)

        console.log(`✓ Updated ${sourceFile}`)
    } catch (err) {
        console.error(`✗ Failed to read ${sourceFile}:`, err)
        process.exit(1)
    }
}

writeFileSync(readmePath, updated)
console.log("\n✓ README.md synced successfully")
