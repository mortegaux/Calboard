#!/bin/bash
# Cleanup demo mode after screenshot

set -e

echo "=========================================="
echo "  Calboard Screenshot Demo Cleanup"
echo "=========================================="
echo ""

# Remove demo ICS file
if [ -f "public/demo.ics" ]; then
    echo "🗑️  Removing demo calendar..."
    rm -f public/demo.ics
    echo "✓ Demo calendar removed"
fi

# Restore original config if backup exists
if [ -f "config.backup.json" ]; then
    echo ""
    echo "♻️  Restoring original config..."
    cp config.backup.json config.json
    rm -f config.backup.json
    echo "✓ Original config restored"
else
    echo ""
    echo "⚠️  No backup found, keeping current config"
fi

echo ""
echo "=========================================="
echo "  ✅ Cleanup Complete!"
echo "=========================================="
echo ""
echo "Your original configuration has been restored."
echo ""
echo "Don't forget to:"
echo "  1. Restart server if it's running"
echo "  2. Commit the new screenshot if you're happy with it:"
echo "     git add docs/preview.png"
echo "     git commit -m 'Update preview screenshot with demo data'"
echo "     git push"
echo ""
