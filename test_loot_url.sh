#!/bin/bash
# Quick test script to open game with loot parameters

API_KEY=$(grep GROQ_API_KEY tests/.env | cut -d= -f2)

if [ -z "$API_KEY" ]; then
    echo "ERROR: No API key found in tests/.env"
    exit 1
fi

echo "Opening game with extra_bomb next to Player 1..."
echo ""
echo "URL Parameters supported:"
echo "  extrabomb_player1=true   - Place extra_bomb next to Player 1"
echo "  flashradius_player2=true - Place flash_radius next to Player 2"
echo "  bombpickup_player3=true  - Place bomb_pickup next to Player 3"
echo "  maxRounds=10             - Auto-stop after 10 rounds"
echo ""
echo "Example URLs:"
echo "  file://$(pwd)/index.html#${API_KEY}&extrabomb_player1=true"
echo "  file://$(pwd)/index.html#${API_KEY}&extrabomb_player1=true&flashradius_player2=true"
echo "  file://$(pwd)/index.html#${API_KEY}&extrabomb_player1=true&maxRounds=10"
echo ""

open "file://$(pwd)/index.html#${API_KEY}&extrabomb_player1=true&maxRounds=10"
