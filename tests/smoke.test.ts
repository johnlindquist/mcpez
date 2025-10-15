import { expect, test } from "bun:test"
import { spawn } from "node:child_process"
import { readdirSync } from "node:fs"
import { join } from "node:path"

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
  const tsconfigPath = join(repoRoot, "tsconfig.json")
  const { code, stderr } = await runWithTimeout("bun", ["x", "tsc", "--noEmit", "-p", tsconfigPath])
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
      expect(stdout).toContain("generate_content")
    } finally {
      server.kill("SIGKILL")
    }
  })
}
