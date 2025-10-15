import { expect, test } from "bun:test"
import { prompt, resource, resourceTemplate, startServer, tool } from "../src/index"

test("exports are functions", () => {
  expect(typeof startServer).toBe("function")
  expect(typeof prompt).toBe("function")
  expect(typeof tool).toBe("function")
  expect(typeof resource).toBe("function")
  expect(typeof resourceTemplate).toBe("function")
})
