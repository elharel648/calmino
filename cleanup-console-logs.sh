#!/bin/bash
# cleanup-console-logs.sh
# Script to remove console.log statements from production code

echo "🔍 Finding console.log statements..."

# Count total
TOTAL=$(find services pages components hooks utils -name "*.ts" -o -name "*.tsx" | xargs grep -n "console\.log" | wc -l | tr -d ' ')
echo "Found $TOTAL console.log statements"

# Option 1: Comment them out (safer)
echo ""
echo "Option 1: Comment out all console.log statements"
echo "This will change:"
echo "  console.log('test') → // console.log('test')"
echo ""

# Option 2: Remove only in production (recommended)
echo "Option 2: Conditional logging (RECOMMENDED)"
echo "This will change:"
echo "  console.log('test') → if (__DEV__) console.log('test')"
echo ""

echo "For production build, console.logs are automatically removed by Metro bundler."
echo "No action needed for MVP!"
echo ""
echo "If you still want to clean them manually:"
echo ""
echo "# Comment out all logs:"
echo "find services pages components hooks utils -name \"*.ts\" -o -name \"*.tsx\" | xargs sed -i '' 's/console\.log/\/\/ console.log/g'"
echo ""
echo "# Add __DEV__ conditional:"
echo "find services pages components hooks utils -name \"*.ts\" -o -name \"*.tsx\" | xargs sed -i '' 's/console\.log(/if (__DEV__) console.log(/g'"
