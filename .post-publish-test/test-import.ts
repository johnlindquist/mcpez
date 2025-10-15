// Test that z can be imported from mcpez
import { z } from "mcpez"

const schema = z.object({
  name: z.string(),
  age: z.number(),
})

console.log("✅ z imported successfully from mcpez")
console.log("Schema:", schema.parse({ name: "test", age: 42 }))
