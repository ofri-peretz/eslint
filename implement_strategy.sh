#!/bin/bash

# Script to implement strategy property for non-fixable ESLint rules
# This script helps automate the process of adding strategy support to rules

echo "🔧 ESLint Rule Strategy Implementation Helper"
echo "=============================================="
echo ""

# Function to add strategy to a rule file
add_strategy_to_rule() {
    local rule_file="$1"
    local rule_name="$2"
    local strategies="$3"
    
    echo "📝 Processing: $rule_name"
    
    # Check if strategy is already implemented
    if grep -q "strategy?:" "$rule_file"; then
        echo "  ✅ Strategy already implemented for $rule_name"
        return
    fi
    
    # Add strategy to Options interface
    sed -i "/^\s*}/ s/}/\n  \/** Strategy for fixing ${rule_name}: ${strategies} *\/\n  strategy?: ${strategies//\// | } | 'auto';\n}/" "$rule_file"
    
    # Add strategy message IDs to MessageIds type
    sed -i "/^type MessageIds =/ s/;/ | 'strategy${strategies//, /}' | 'strategy${strategies//, /}' | 'strategyAuto';/" "$rule_file"
    
    # Add strategy messages
    # This part would need customization per rule
    
    echo "  ✅ Added strategy framework to $rule_name"
}

echo "🎯 Strategy Implementation Pattern:"
echo "===================================="
echo ""
echo "For each non-fixable rule, implement:"
echo ""
echo "1. Add to Options interface:"
echo "   strategy?: 'option1' | 'option2' | 'auto';"
echo ""
echo "2. Add to MessageIds type:"
echo "   | 'strategyOption1' | 'strategyOption2' | 'strategyAuto'"
echo ""
echo "3. Add strategy messages in meta.messages:"
echo "   strategyOption1: '📋 Description of option1 strategy'"
echo "   strategyOption2: '📋 Description of option2 strategy'"
echo "   strategyAuto: '🎯 Apply context-aware approach'"
echo ""
echo "4. Add to schema.properties:"
echo "   strategy: { type: 'string', enum: ['option1', 'option2', 'auto'], default: 'auto' }"
echo ""
echo "5. Add to defaultOptions:"
echo "   strategy: 'auto'"
echo ""
echo "6. Add strategy selection logic:"
echo "   const selectStrategyMessage = () => { switch(strategy) { ... } }"
echo ""
echo "7. Update context.report to use strategy message"
echo ""

echo "📋 Rules needing strategy implementation:"
echo "=========================================="

# List all rules that don't have strategy
echo "Security rules without strategy:"
ls packages/eslint-plugin/src/rules/security/ | grep -v "detect-child-process\|detect-eval-with-expression\|detect-object-injection\|no-sql-injection\|database-injection\|no-unsafe-dynamic-require\|no-hardcoded-credentials" | sed 's/^/  - /'

echo ""
echo "Architecture rules (check which need strategy):"
ls packages/eslint-plugin/src/rules/architecture/ | sed 's/^/  - /'

echo ""
echo "Other categories (check which need strategy):"
for dir in quality error-handling performance accessibility api react migration deprecation domain duplication complexity ddd; do
    if [ -d "packages/eslint-plugin/src/rules/$dir" ]; then
        echo "$dir rules:"
        ls "packages/eslint-plugin/src/rules/$dir/" | sed 's/^/  - /'
    fi
done

echo ""
echo "🎯 Next steps:"
echo "1. Choose appropriate strategies for each rule category"
echo "2. Implement strategy for high-priority rules first"
echo "3. Test each implementation"
echo "4. Run linting to ensure no errors"
