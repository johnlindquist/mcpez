# Agent Guidelines for mcpez

This document provides comprehensive guidelines for AI agents and developers working on the mcpez codebase.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [CRITICAL: Zod Version Requirements](#critical-zod-version-requirements)
3. [TypeScript Conventions](#typescript-conventions)
4. [API Design Principles](#api-design-principles)
5. [Examples and Testing Guidelines](#examples-and-testing-guidelines)
6. [Build and Publish Workflow](#build-and-publish-workflow)

---

## Project Structure

This is **mcpez** - a minimal, ergonomic ESM wrapper for building MCP (Model Context Protocol) servers with TypeScript and Bun.

### Core Architecture

- **Main entry point**: `src/index.ts` - exports `prompt`, `tool`, `resource`, `resourceTemplate`, `startServer`, and re-exports `z` from Zod
- **State management**: `src/internal/state.ts` - handles registration queue and server lifecycle
- **Built output**: `dist/` directory (TypeScript compiled output)

### Key Principles

1. **ESM-only**: This package ships ESM only. All code uses ES module syntax
2. **Auto-start behavior**: If `startServer()` is not called explicitly, the server automatically starts on the next tick
3. **Registration queue**: All `prompt()`, `tool()`, and `resource()` calls are queued if called before server starts, then flushed when server initializes
4. **Zod bundling**: Zod v3 is bundled with mcpez. Always import `z` from "mcpez", never from "zod" directly

### Main APIs

- `prompt(name, options, handler)` - Register MCP prompts
- `tool(name, options, handler)` - Register MCP tools  
- `resource(name, uri|template, metadata, readCallback)` - Register MCP resources
- `resourceTemplate(name, template, metadata, readCallback)` - Register templated resources
- `startServer(name?, serverOptions?, transport?)` - Manually start the server (optional)

### Dependencies

- `@modelcontextprotocol/sdk` - Core MCP SDK
- `zod` v3.23.8 - Schema validation (bundled, version locked)

### Development Tools

- **Bun**: Package manager and runtime
- **Biome**: Linting and formatting (configured in `biome.json`)
- **TypeScript**: Type checking with three configs:
  - `tsconfig.json` - Main config
  - `tsconfig.build.json` - Build config
  - `tsconfig.examples.json` - Examples config

---

## CRITICAL: Zod Version Requirements

### Bundled Zod v3

**mcpez bundles Zod v3** to ensure compatibility with the MCP SDK, which requires Zod v3 specifically.

### Why Zod v3 is Locked

- Zod v4 has breaking changes that cause runtime errors like `keyValidator._parse is not a function`
- The MCP SDK depends on Zod v3 internal APIs
- Version conflicts between user-installed Zod and SDK Zod cause crashes

### Enforcement

1. **Package.json controls**: 
   - Dependencies specify `zod: "^3.23.8"`
   - `resolutions` and `overrides` fields lock the version
   
2. **Pre-publish check**: `scripts/check-zod-version.ts` runs before build and publish to verify Zod v3

3. **User imports**: Users should ALWAYS import `z` from "mcpez":
   ```typescript
   import { z } from "mcpez"  // ✅ Correct
   import { z } from "zod"    // ❌ Wrong - may cause version conflicts
   ```

### When Modifying Dependencies

- Never upgrade Zod to v4
- Never remove the `resolutions` or `overrides` fields from `package.json`
- Always run `bun run check-zod-version` before commits that touch dependencies
- Inform users that Zod is bundled (don't need to install separately)

---

## TypeScript Conventions

### Import Style

1. Always use ESM imports (never CommonJS)
2. Import `z` from "mcpez" in user-facing code, not from "zod" directly
3. Import SDK types from `@modelcontextprotocol/sdk/server/mcp.js` and `@modelcontextprotocol/sdk/server/stdio.js`

### Type Safety

1. **Type narrowing**: Use the narrowed types exported from `src/index.ts`:
   - `RegisterPromptOptions` (loosens Zod typing for v3/v4 compatibility)
   - `ToolOptions` (loosens schema typing)
   - `PromptHandler`, `ToolHandler` (derived from SDK)
   - `ResourceReadCallback`, `ResourceTemplateReadCallback`

2. **Zod schema typing**: Use `Record<string, unknown> | unknown` for schemas to avoid Zod v3/v4 type identity issues

3. **Re-exports**: Prefer using re-exported types from the main index rather than deep imports

### Code Organization

1. Internal state management goes in `src/internal/`
2. All public APIs are exported from `src/index.ts`
3. Tests go in `tests/` directory
4. Example code goes in `tests/examples/` directory

### Async/Await

1. Tool and resource handlers should be async functions
2. `startServer()` returns a Promise and should be awaited
3. The auto-start mechanism uses `void` to fire-and-forget, with error handling to console

### Type Casting

When bridging between loosened types and SDK types, use `as unknown as SDKType` pattern:
```typescript
server.registerPrompt(name, options as unknown as SDKRegisterPromptOptions, handler)
```

This is intentional to support both Zod v3 and v4 without strict type identity checks.

---

## API Design Principles

### Minimalism and Ergonomics

mcpez prioritizes **minimal boilerplate** and **ergonomic DX** over verbose configuration.

#### Registration Pattern

All registration functions follow the same pattern:
```typescript
function(name: string, options: Object, handler?: Function)
```

This consistency makes the API predictable and easy to learn.

#### Auto-start Behavior

**Key design decision**: Server auto-starts on next tick if not manually started.

**Rationale**:
- Reduces boilerplate for simple servers
- Allows "just register and run" workflow
- Advanced users can still call `startServer()` explicitly for custom configuration

**Implementation** (see `src/index.ts`):
- Registration functions call `scheduleAutomaticStart()`
- Timer is canceled if `startServer()` is called manually
- Only one auto-start can be scheduled

#### Optional `startServer()`

Users can:
1. **Implicit**: Just register tools/prompts/resources → auto-starts
2. **Explicit**: Call `startServer(name, options, transport)` for control

Both patterns are valid. Documentation should show both.

### Type System Philosophy

#### Loose Typing for Schemas

The type system intentionally **loosens** Zod schema types to avoid version conflicts:

```typescript
export type RegisterPromptOptions = Omit<SDKRegisterPromptOptions, "argsSchema"> & {
  argsSchema?: Record<string, unknown> | unknown
}
```

**Rationale**:
- Zod v3 vs v4 have different type identities
- Type identity checks would fail even when runtime works
- Users get autocomplete without strict type checking

#### Re-exports for Convenience

The package re-exports:
- `z` from "zod" - So users don't need separate Zod dependency
- SDK types - So users don't need deep imports

**Principle**: Minimize external dependencies users need to know about.

### Error Handling

#### Silent Failures vs. Loud Errors

- **Double start**: Throws error - this is a programming mistake
- **Auto-start failure**: Logs to console - user should see but shouldn't crash
- **Registration failures**: Queued operations don't validate early - fail fast at server start

**Rationale**: Errors that indicate bugs should throw; runtime issues should log.

### Backward Compatibility

When adding features:
1. Never break the core registration pattern
2. Add optional parameters rather than required ones
3. Maintain type exports for external users
4. Test that examples from README still work

---

## Examples and Testing Guidelines

### Test Structure

- `tests/basic.test.ts` - Basic unit tests
- `tests/smoke.test.ts` - Integration smoke tests
- `tests/examples/` - Example MCP servers (also used in README)

### Example Files

Examples in `tests/examples/` serve two purposes:
1. Demonstrate API usage
2. Provide copy-paste templates for users

#### Example Naming Convention

- `tool.*.ts` - Tool registration examples
- `prompt.*.ts` - Prompt registration examples
- `resource.*.ts` - Resource registration examples
- `full.*.ts` - Complete server examples with multiple capabilities

#### Example Requirements

1. **Imports**: Always import from `"../../src/index"` in examples (relative to test location)
2. **Minimal examples**: Show the simplest possible usage
3. **Self-contained**: Each example should be runnable standalone
4. **Comments**: Include helpful comments explaining non-obvious behavior
5. **Process handling**: Test examples may need `process.exit(0)` to avoid hanging

### README Synchronization

The `scripts/sync-readme.ts` script keeps README examples in sync with test examples:

- README includes special comments like `<!-- Source: tests/examples/tool.minimal.ts -->`
- Build process runs `sync-readme` to ensure documentation matches code
- When adding new examples, add them to README with source comments

### Testing with MCP Inspector

Some examples use `@modelcontextprotocol/inspector`:
- `*.inspect.ts` files are meant to run with the MCP Inspector
- They demonstrate server behavior in a visual debugging environment

### Running Tests

```bash
bun test              # Run all tests (includes Zod version check)
bun run check-zod-version  # Verify Zod v3 is installed
```

---

## Build and Publish Workflow

### Build Process

```bash
bun run build
```

This runs:
1. TypeScript compilation via `tsc -p tsconfig.build.json`
2. README sync via `bun run sync-readme`

**Build outputs to**: `dist/` directory (see `package.json` "files" field)

### Pre-publish Checks

The `prepublishOnly` script runs automatically before `npm publish`:
1. `bun run check-zod-version` - Ensures Zod v3 is installed
2. `bun run build` - Fresh build

**NEVER skip these checks** - they prevent publishing broken packages.

### Package Exports

From `package.json`:
```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  }
}
```

The package exports a single entry point with both runtime and type definitions.

### Code Quality Scripts

- `bun run lint` - Check code with Biome
- `bun run format` - Format code (dry-run)
- `bun run format:write` - Format code (write changes)
- `bun run fix` - Auto-fix safe issues
- `bun run fix:unsafe` - Auto-fix including unsafe changes

**Always run** `bun run fix` before committing code changes.

### Semantic Release

This project uses semantic-release for automated versioning and publishing:
- Conventional commits determine version bumps
- GitHub Actions automates releases
- NPM package is published automatically on merge to main

### Important Files Not to Modify Without Consideration

1. **`package.json`** - Especially `resolutions`, `overrides`, and Zod version
2. **`scripts/check-zod-version.ts`** - Critical safety check
3. **`tsconfig.build.json`** - Controls what gets built for distribution

---

## Quick Reference

### File Structure
```
mcpez/
├── src/
│   ├── index.ts          # Main entry point
│   └── internal/
│       └── state.ts      # Registration queue & lifecycle
├── dist/                 # Build output
├── tests/
│   ├── basic.test.ts
│   ├── smoke.test.ts
│   └── examples/         # Runnable examples
├── scripts/
│   ├── check-zod-version.ts
│   └── sync-readme.ts
└── package.json
```

### Key Commands
```bash
bun run build          # Build the package
bun run fix            # Fix code style issues
bun test               # Run tests
bun run check-zod-version  # Verify Zod v3
```

### Critical Reminders
- ✅ Always import `z` from "mcpez"
- ✅ Keep Zod at v3.23.8
- ✅ Run `bun run fix` before commits
- ❌ Never upgrade to Zod v4
- ❌ Never remove resolutions/overrides from package.json
