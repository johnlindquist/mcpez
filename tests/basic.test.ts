import { test, expect } from "bun:test";
import {
    startServer,
    registerPrompt,
    registerTool,
    registerResource,
    registerResourceTemplate,
} from "../src/index";

test("exports are functions", () => {
    expect(typeof startServer).toBe("function");
    expect(typeof registerPrompt).toBe("function");
    expect(typeof registerTool).toBe("function");
    expect(typeof registerResource).toBe("function");
    expect(typeof registerResourceTemplate).toBe("function");
});


