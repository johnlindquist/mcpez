#!/bin/bash

# Post-publish integration tests for mcpez
# This script tests the published npm package against real-world scenarios

set -e  # Exit on error

cd "$(dirname "$0")"
TEST_DIR=$(pwd)
PARENT_DIR="$(dirname "$TEST_DIR")"

echo "🧪 Running post-publish integration tests for mcpez"
echo "=================================================="
echo ""

# Get installed version
INSTALLED_VERSION=$(node -p "require('./package.json').dependencies.mcpez")
echo "📦 Testing mcpez@${INSTALLED_VERSION}"
echo ""

# Test 1: Prompts list
echo "✅ Test 1: List prompts"
cd "$PARENT_DIR"
bunx @modelcontextprotocol/inspector --cli bun .post-publish-test/test-prompt.ts --method prompts/list > /dev/null 2>&1
echo "   ✓ prompts/list works"

# Test 2: Prompts get with arguments
echo "✅ Test 2: Get prompt with arguments"
OUTPUT=$(bunx @modelcontextprotocol/inspector --cli bun .post-publish-test/test-prompt.ts --method prompts/get --prompt-name review-code --prompt-args subject="console.log('test')" 2>/dev/null)
if echo "$OUTPUT" | grep -q "Please review this code"; then
    echo "   ✓ prompts/get with arguments works"
else
    echo "   ✗ prompts/get failed"
    exit 1
fi

# Test 3: Tools list
echo "✅ Test 3: List tools"
bunx @modelcontextprotocol/inspector --cli bun .post-publish-test/test-tool.ts --method tools/list > /dev/null 2>&1
echo "   ✓ tools/list works"

# Test 4: Tools call with arguments
echo "✅ Test 4: Call tool with arguments"
OUTPUT=$(bunx @modelcontextprotocol/inspector --cli bun .post-publish-test/test-tool.ts --method tools/call --tool-name calculate --tool-arg operation=add --tool-arg a=10 --tool-arg b=5 2>/dev/null)
if echo "$OUTPUT" | grep -q "10 add 5 = 15"; then
    echo "   ✓ tools/call with arguments works"
else
    echo "   ✗ tools/call failed"
    exit 1
fi

# Test 5: Tools call with different operation
echo "✅ Test 5: Call tool with multiply operation"
OUTPUT=$(bunx @modelcontextprotocol/inspector --cli bun .post-publish-test/test-tool.ts --method tools/call --tool-name calculate --tool-arg operation=multiply --tool-arg a=7 --tool-arg b=6 2>/dev/null)
if echo "$OUTPUT" | grep -q "7 multiply 6 = 42"; then
    echo "   ✓ tools/call with multiply works"
else
    echo "   ✗ tools/call multiply failed"
    exit 1
fi

# Test 6: Resources list
echo "✅ Test 6: List resources"
bunx @modelcontextprotocol/inspector --cli bun .post-publish-test/test-resource.ts --method resources/list > /dev/null 2>&1
echo "   ✓ resources/list works"

# Test 7: Resources read
echo "✅ Test 7: Read resource"
OUTPUT=$(bunx @modelcontextprotocol/inspector --cli bun .post-publish-test/test-resource.ts --method resources/read --uri greeting://hello 2>/dev/null)
if echo "$OUTPUT" | grep -q "Hello from the post-publish test"; then
    echo "   ✓ resources/read works"
else
    echo "   ✗ resources/read failed"
    exit 1
fi

echo ""
echo "=================================================="
echo "🎉 All post-publish tests passed!"
echo "📦 mcpez@${INSTALLED_VERSION} is working correctly"
