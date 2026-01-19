#!/bin/bash
# Calboard Docker Update Script

set -e

echo "========================================"
echo "  Calboard Update"
echo "========================================"
echo ""

# Backup config before update
if [ -f "config.json" ]; then
    BACKUP_FILE="config.backup.$(date +%Y%m%d_%H%M%S).json"
    echo "📦 Backing up config.json to $BACKUP_FILE"
    cp config.json "$BACKUP_FILE"
    echo "✓ Backup created"
    echo ""
fi

# Pull latest changes if in git repo
if [ -d ".git" ]; then
    echo "🔄 Pulling latest changes..."
    git pull
    echo "✓ Code updated"
    echo ""
fi

# Stop current container
echo "🛑 Stopping current container..."
docker-compose down

# Rebuild image
echo "🔨 Rebuilding Docker image..."
docker-compose build --no-cache

# Start new container
echo "🚀 Starting updated container..."
docker-compose up -d

# Wait for container to be healthy
echo ""
echo "⏳ Waiting for Calboard to start..."
sleep 5

# Check if running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "========================================"
    echo "  ✅ Update Complete!"
    echo "========================================"
    echo ""
    echo "Calboard is running at: http://localhost:3000"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo ""
else
    echo ""
    echo "========================================"
    echo "  ❌ Update Failed"
    echo "========================================"
    echo ""
    echo "Check logs with: docker-compose logs"
    echo ""

    # Try to restore backup
    if [ -f "$BACKUP_FILE" ]; then
        echo "Restoring config from backup..."
        cp "$BACKUP_FILE" config.json
        echo "Config restored. Try running: docker-compose up -d"
    fi

    exit 1
fi
