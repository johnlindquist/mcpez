import { expect, test } from "bun:test"
import { spawn } from "node:child_process"
import { readdirSync } from "node:fs"
import { join } from "node:path"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const repoRoot = new URL("..", import.meta.url).pathname
const examplesDir = join(repoRoot, "tests", "examples")
const exampleFiles = readdirSync(examplesDir).filter((f) => f.endsWith(".ts"))

function runWithTimeout(
  cmd: string,
  args: string[],
  timeoutMs = 5000,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: repoRoot,
      env: process.env,
    })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      reject(new Error(`Process timed out after ${timeoutMs}ms: ${cmd} ${args.join(" ")}`))
    }, timeoutMs)
    child.stdout.on("data", (d) => {
      stdout += String(d)
    })
    child.stderr.on("data", (d) => {
      stderr += String(d)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
    child.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

test("tsc type-checks example scripts (no emit)", async () => {
  const tsconfigPath = join(repoRoot, "tsconfig.examples.json")
  const { code, stderr } = await runWithTimeout("bun", ["x", "tsc", "-p", tsconfigPath])
  if (code !== 0) {
    throw new Error(`tsc failed with code ${code}:\n${stderr}`)
  }
  expect(code).toBe(0)
})

for (const file of exampleFiles.filter((f) => !f.includes("inspect"))) {
  test(`bun runs ${file} without runtime errors`, async () => {
    const examplePath = join(examplesDir, file)
    const { code, stderr } = await runWithTimeout("bun", ["run", examplePath], 7000)
    if (code !== 0) {
      throw new Error(`bun run exited with code ${code}:\n${stderr}`)
    }
    expect(code).toBe(0)
  })
}

for (const file of exampleFiles.filter((f) => f.includes("inspect"))) {
  test(`inspector lists prompts via stdio for ${file}`, async () => {
    const examplePath = join(examplesDir, file)
    const server = spawn("bun", ["run", examplePath], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: repoRoot,
      env: process.env,
    })
    await new Promise((r) => setTimeout(r, 250))
    try {
      const { code, stdout, stderr } = await runWithTimeout(
        "bun",
        [
          "x",
          "@modelcontextprotocol/inspector",
          "--cli",
          "bun",
          examplePath,
          "--method",
          "prompts/list",
        ],
        7000,
      )
      if (stdout) console.log(`Inspector stdout:\n${stdout}`)
      if (stderr) console.log(`Inspector stderr:\n${stderr}`)
      if (code !== 0) {
        throw new Error(`inspector failed code ${code}:\n${stderr}`)
      }
      // Verify at least one prompt is listed
      expect(stdout).toContain('"name"')
      expect(stdout).toContain('"description"')
      expect(stdout).toMatch(/"name"\s*:\s*"[^"]+"/)
    } finally {
      server.kill("SIGKILL")
    }
  })
}

// Test tools/list on full server example which has tools
// NOTE: The MCP inspector has a stricter schema validation than real MCP clients
// These tests catch issues that would prevent real agent usage
// test("inspector can call tools/list on full.inspect.ts", async () => {
//     const examplePath = join(examplesDir, "full.inspect.ts")
//     const server = spawn("bun", ["run", examplePath], {
//         stdio: ["ignore", "pipe", "pipe"],
//         cwd: repoRoot,
//         env: process.env,
//     })
//     await new Promise((r) => setTimeout(r, 250))
//     try {
//         const { code, stdout, stderr } = await runWithTimeout(
//             "bun",
//             [
//                 "x",
//                 "@modelcontextprotocol/inspector",
//                 "--cli",
//                 "bun",
//                 examplePath,
//                 "--method",
//                 "tools/list",
//             ],
//             7000,
//         )
//         if (code !== 0) {
//             throw new Error(`inspector tools/list failed code ${code}:\n${stderr}`)
//         }
//         expect(stdout).toContain("get_time")
//     } finally {
//         server.kill("SIGKILL")
//     }
// })

// Test resources/list on full server example which has resources
// test("inspector can call resources/list on full.inspect.ts", async () => {
//     const examplePath = join(examplesDir, "full.inspect.ts")
//     const server = spawn("bun", ["run", examplePath], {
//         stdio: ["ignore", "pipe", "pipe"],
//         cwd: repoRoot,
//         env: process.env,
//     })
//     await new Promise((r) => setTimeout(r, 250))
//     try {
//         const { code, stdout, stderr } = await runWithTimeout(
//             "bun",
//             [
//                 "x",
//                 "@modelcontextprotocol/inspector",
//                 "--cli",
//                 "bun",
//                 examplePath,
//                 "--method",
//                 "resources/list",
//             ],
//             7000,
//         )
//         if (code !== 0) {
//             throw new Error(`inspector resources/list failed code ${code}:\n${stderr}`)
//         }
//         expect(stdout).toContain("config")
//     } finally {
//         server.kill("SIGKILL")
//     }
// })

// Test prompts/get with arguments - this is critical for real-world usage
test("inspector can call prompts/get with args on prompt.review.ts", async () => {
  const examplePath = join(examplesDir, "prompt.review.ts")
  const { code, stdout, stderr } = await runWithTimeout(
    "bun",
    [
      "x",
      "@modelcontextprotocol/inspector",
      "--cli",
      "bun",
      examplePath,
      "--method",
      "prompts/get",
      "--prompt-name",
      "review-code",
      "--prompt-args",
      "subject=console.log('hi')",
    ],
    7000,
  )
  if (stdout) console.log(`Inspector stdout:\n${stdout}`)
  if (stderr) console.log(`Inspector stderr:\n${stderr}`)
  if (code !== 0) {
    throw new Error(`inspector prompts/get failed with code ${code}:\n${stderr}`)
  }
  expect(code).toBe(0)
  expect(stdout).toContain("Please review this code")
  expect(stdout).toContain("console.log('hi')")
})

test("logging example emits notifications when tools are called", async () => {
  const examplePath = join(examplesDir, "logging.minimal.ts")
  const client = new Client({ name: "mcpez-smoke", version: "1.0.0" })
  const transport = new StdioClientTransport({
    command: "bun",
    args: [examplePath],
    cwd: repoRoot,
    stderr: "pipe",
  })

  const logs: Array<{ level: string; data: unknown }> = []
  client.fallbackNotificationHandler = async (notification) => {
    if (notification.method === "notifications/message") {
      logs.push(notification.params as { level: string; data: unknown })
    }
  }

  try {
    await client.connect(transport)
    await client.setLoggingLevel("debug")
    const response = await client.callTool({ name: "greet", arguments: {} })
    expect(response.content?.[0]?.type).toBe("text")
    expect(response.content?.[0]?.text).toContain("Hello from mcpez!")

    await new Promise((resolve) => setTimeout(resolve, 100))

    const hasQueuedLog = logs.some(
      (entry) =>
        entry.level === "debug" && entry.data === "Server not started yet, logging is queued",
    )
    const hasToolLog = logs.some(
      (entry) => entry.level === "info" && entry.data === "Greeting tool was called",
    )

    expect(hasQueuedLog).toBe(true)
    expect(hasToolLog).toBe(true)
  } finally {
    await client.close().catch(() => {})
    await transport.close().catch(() => {})
  }
})

// Test tools/list - critical for catching Zod schema issues
test("inspector can call tools/list on tool.gh.ts", async () => {
  const examplePath = join(examplesDir, "tool.gh.ts")
  const { code, stdout, stderr } = await runWithTimeout(
    "bun",
    ["x", "@modelcontextprotocol/inspector", "--cli", "bun", examplePath, "--method", "tools/list"],
    7000,
  )
  if (stdout) console.log(`Inspector stdout:\n${stdout}`)
  if (stderr) console.log(`Inspector stderr:\n${stderr}`)
  if (code !== 0) {
    throw new Error(`inspector tools/list failed with code ${code}:\n${stderr}`)
  }
  expect(code).toBe(0)
  expect(stdout).toContain("create-issue")
  expect(stdout).toContain("title")
  expect(stdout).toContain("body")
})

// Test tools/call with arguments
test("inspector can call tools/call on tool.minimal.ts", async () => {
  const examplePath = join(examplesDir, "tool.minimal.ts")
  const { code, stdout, stderr } = await runWithTimeout(
    "bun",
    [
      "x",
      "@modelcontextprotocol/inspector",
      "--cli",
      "bun",
      examplePath,
      "--method",
      "tools/call",
      "--tool-name",
      "add",
      "--tool-arg",
      "a=5",
      "--tool-arg",
      "b=3",
    ],
    7000,
  )
  if (stdout) console.log(`Inspector stdout:\n${stdout}`)
  if (stderr) console.log(`Inspector stderr:\n${stderr}`)
  if (code !== 0) {
    throw new Error(`inspector tools/call failed with code ${code}:\n${stderr}`)
  }
  expect(code).toBe(0)
  expect(stdout).toContain("5 + 3 = 8")
})
