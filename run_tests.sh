#!/bin/bash
# Run all Bombervibe tests

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     BOMBERVIBE TEST SUITE - Deterministic Testing       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "   Run: python3 -m venv .venv && source .venv/bin/activate && pip install playwright python-dotenv"
    exit 1
fi

# Activate virtual environment
source .venv/bin/activate

# Check if .env exists
if [ ! -f "tests/.env" ]; then
    echo "❌ tests/.env not found!"
    echo "   Create it with: echo 'GROQ_API_KEY=gsk_...' > tests/.env"
    exit 1
fi

echo "✓ Environment ready"
echo ""

# Run each test suite
TESTS=(
    "test_seeded_world.py"
    "test_mock_llm.py"
    "test_game_mechanics.py"
)

PASSED=0
FAILED=0

for test in "${TESTS[@]}"; do
    echo "═══════════════════════════════════════════════════════════"
    echo "Running: $test"
    echo "═══════════════════════════════════════════════════════════"

    if python "tests/$test"; then
        ((PASSED++))
        echo "✓ PASSED: $test"
    else
        ((FAILED++))
        echo "✗ FAILED: $test"
    fi
    echo ""
done

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                          ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Passed: $PASSED                                                ║"
echo "║  Failed: $FAILED                                                ║"
echo "╚══════════════════════════════════════════════════════════╝"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed!"
    exit 0
else
    echo ""
    echo "❌ Some tests failed"
    exit 1
fi
