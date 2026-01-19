# Calboard Docker Deployment Guide

This guide covers building, deploying, and updating Calboard using Docker.

## Quick Start

### 1. Build and Run with Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The dashboard will be available at `http://localhost:3000`

### 2. Manual Docker Build

```bash
# Build the image
docker build -t calboard:latest .

# Run the container
docker run -d \
  --name calboard \
  -p 3000:3000 \
  -v $(pwd)/config.json:/app/config.json \
  --restart unless-stopped \
  calboard:latest
```

## Initial Setup

### First Run

On first run, Calboard will start in setup mode:

1. Open `http://localhost:3000` in your browser
2. Follow the setup wizard to configure:
   - Weather API settings (OpenWeatherMap)
   - Calendar feeds (ICS URLs)
   - Display preferences
   - Admin password

Your configuration will be saved to `config.json` in the project directory.

### Using Existing Config

If you already have a `config.json`:

```bash
# Make sure config.json exists in the project root
ls config.json

# Start the container (it will mount your existing config)
docker-compose up -d
```

## Deployment Options

### Raspberry Pi Deployment

#### Install Docker on Raspberry Pi

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get install docker-compose -y

# Reboot
sudo reboot
```

#### Deploy Calboard

```bash
# Clone or copy the project to your Pi
cd /home/pi/calboard

# Build and run
docker-compose up -d

# Set up autostart on boot (already configured with restart: unless-stopped)
```

#### Enable Kiosk Mode on Pi

For automatic fullscreen display on boot:

```bash
# Install Chromium (if not already installed)
sudo apt-get install chromium-browser -y

# Edit autostart
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart

# Add these lines:
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000

# Reboot to test
sudo reboot
```

### Linux/Mac Server Deployment

```bash
# Clone the repository
git clone <your-repo-url> calboard
cd calboard

# Build and start
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs
```

### Windows Deployment

```powershell
# Using PowerShell or Command Prompt
cd C:\path\to\calboard

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f
```

## Updating Calboard

### Method 1: Docker Compose (Easiest)

```bash
# Stop the current container
docker-compose down

# Pull latest code (if using git)
git pull

# Rebuild and restart
docker-compose up -d --build

# Your config.json is preserved!
```

### Method 2: Manual Update

```bash
# Stop and remove old container
docker stop calboard
docker remove calboard

# Rebuild image
docker build -t calboard:latest .

# Start new container (config.json is preserved)
docker run -d \
  --name calboard \
  -p 3000:3000 \
  -v $(pwd)/config.json:/app/config.json \
  --restart unless-stopped \
  calboard:latest
```

### Update Script (Linux/Mac)

Create `update.sh`:

```bash
#!/bin/bash
echo "Updating Calboard..."

# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

echo "Update complete! Calboard is running."
echo "Access at: http://localhost:3000"
```

Make executable:
```bash
chmod +x update.sh
./update.sh
```

## Configuration Persistence

Your `config.json` is stored on the host machine and mounted into the container. This means:

✅ Updates won't delete your configuration
✅ You can backup just the config.json file
✅ Switching between versions is safe

### Backup Your Configuration

```bash
# Backup
cp config.json config.backup.json

# Or with timestamp
cp config.json "config.backup.$(date +%Y%m%d_%H%M%S).json"
```

### Restore Configuration

```bash
# Restore from backup
cp config.backup.json config.json

# Restart container to apply
docker-compose restart
```

## Port Configuration

To change the port (e.g., to use port 8080):

**Option 1: Edit docker-compose.yml**

```yaml
ports:
  - "8080:3000"  # Host:Container
```

**Option 2: Environment Variable**

```bash
# Edit docker-compose.yml to add:
environment:
  - PORT=8080

# Then update ports:
ports:
  - "8080:8080"
```

## Reverse Proxy Setup (HTTPS)

### Using Nginx

```nginx
server {
    listen 80;
    server_name calboard.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Using Traefik

Add to `docker-compose.yml`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.calboard.rule=Host(`calboard.example.com`)"
  - "traefik.http.routers.calboard.entrypoints=websecure"
  - "traefik.http.routers.calboard.tls.certresolver=letsencrypt"
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs

# Check if port is in use
sudo netstat -tulpn | grep 3000

# Remove and rebuild
docker-compose down
docker-compose up -d --build
```

### Permission Issues

```bash
# Fix config.json permissions
chmod 644 config.json
chown $USER:$USER config.json
```

### Memory Issues on Raspberry Pi

Edit `docker-compose.yml` to reduce memory:

```yaml
deploy:
  resources:
    limits:
      memory: 256M
```

### View Real-time Logs

```bash
# All logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker logs calboard -f
```

## Container Management

```bash
# Start
docker-compose start

# Stop
docker-compose stop

# Restart
docker-compose restart

# Remove (keeps config.json)
docker-compose down

# Remove including volumes (DELETES CONFIG!)
docker-compose down -v

# View status
docker-compose ps

# Execute command in container
docker-compose exec calboard sh

# View resource usage
docker stats calboard
```

## Multi-Platform Builds

To build for different architectures (e.g., ARM for Raspberry Pi):

```bash
# Enable buildx
docker buildx create --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t calboard:latest \
  --push .
```

## Security Best Practices

1. **Set Admin Password**: Always set a strong password in the setup wizard
2. **Use HTTPS**: Deploy behind a reverse proxy with SSL
3. **Limit Network Access**: Use firewall rules to restrict access
4. **Keep Updated**: Regularly pull updates and rebuild
5. **Backup Config**: Regularly backup your `config.json`

## Advanced Configuration

### Custom Background Images

```bash
# Create backgrounds directory
mkdir -p public/backgrounds

# Copy your images
cp ~/Pictures/background.jpg public/backgrounds/

# Container will automatically mount this directory
docker-compose restart
```

### Environment Variables

Available environment variables:

- `NODE_ENV`: Set to `production` (default in Docker)
- `PORT`: Override default port (default: 3000)

### Network Configuration

To connect to other containers:

```yaml
networks:
  default:
    external:
      name: my-network
```

## Support

- **Issues**: Report at GitHub Issues
- **Documentation**: See README.md and CLAUDE.md
- **Updates**: Pull latest from main branch

## Version Information

- **Base Image**: node:22-alpine
- **Node Version**: 22.x LTS
- **Architecture Support**: amd64, arm64, armv7
- **Automatic Restart**: Enabled by default
- **Health Checks**: Configured at 30s intervals
