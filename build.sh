#!/bin/bash
# Calboard Docker Build Script

set -e

echo "========================================"
echo "  Calboard Docker Build"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker installed"
echo "✓ Docker Compose installed"
echo ""

# Build the image
echo "Building Calboard Docker image..."
docker-compose build

echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Start: docker-compose up -d"
echo "  2. View logs: docker-compose logs -f"
echo "  3. Open browser: http://localhost:3000"
echo ""
