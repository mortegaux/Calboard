# Calboard Docker Quick Start

Get Calboard running in Docker in under 2 minutes!

## Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed (included with Docker Desktop)

## 1. Clone or Download

```bash
cd /path/to/calboard
```

## 2. Build and Start

### Linux/Mac

```bash
# Quick method
./build.sh
docker-compose up -d

# Or manual
docker-compose up -d --build
```

### Windows

```batch
REM Quick method
build.bat
docker-compose up -d

REM Or manual
docker-compose up -d --build
```

## 3. Access Calboard

Open your browser to: **http://localhost:3000**

On first run, you'll see the setup wizard. Configure:
- Weather API (get free key at [OpenWeatherMap](https://openweathermap.org/api))
- Calendar feeds (Google Calendar ICS links)
- Display preferences
- Admin password

## 4. Update Calboard

### Linux/Mac

```bash
./update.sh
```

### Windows

```batch
update.bat
```

## Quick Commands

```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Start
docker-compose up -d

# Check status
docker-compose ps
```

## Raspberry Pi Kiosk Mode

After deploying, set up auto-start:

```bash
# Edit autostart
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart

# Add:
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000

# Reboot
sudo reboot
```

## Configuration

Your `config.json` is saved on the host machine and persists across updates.

**Backup:**
```bash
cp config.json config.backup.json
```

**Restore:**
```bash
cp config.backup.json config.json
docker-compose restart
```

## Troubleshooting

**Port already in use?**
```bash
# Change port in docker-compose.yml
ports:
  - "8080:3000"  # Use port 8080 instead
```

**Container won't start?**
```bash
docker-compose logs
```

**Need to reset?**
```bash
docker-compose down
rm config.json
docker-compose up -d
# Redo setup wizard
```

## Full Documentation

- [DOCKER.md](DOCKER.md) - Complete Docker guide
- [README.md](README.md) - Application documentation
- [CLAUDE.md](CLAUDE.md) - Developer guide

---

**That's it!** Calboard should now be running at http://localhost:3000 🎉
