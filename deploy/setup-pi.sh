#!/bin/bash
# setup-pi.sh - Run this on your Raspberry Pi to set up the headunit
# Usage: curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/rx7-headunit/main/deploy/setup-pi.sh | bash

set -e

GITHUB_REPO="bboynton97/rx7-headunit"  # UPDATE THIS
INSTALL_DIR="/opt/headunit"

echo "=== RX7 Headunit Setup ==="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Please run as regular user (not root). Script will use sudo when needed."
    exit 1
fi

# Install dependencies
echo "[1/6] Installing dependencies..."
sudo apt-get update
sudo apt-get install -y \
    libwebkit2gtk-4.1-0 \
    libayatana-appindicator3-1 \
    librsvg2-2 \
    libasound2 \
    curl \
    jq

# Create install directory
echo "[2/6] Creating install directory..."
sudo mkdir -p "$INSTALL_DIR"
sudo chown $USER:$USER "$INSTALL_DIR"

# Download the updater script
echo "[3/6] Installing updater script..."
curl -sSL "https://raw.githubusercontent.com/${GITHUB_REPO}/main/deploy/headunit-updater.sh" \
    -o "$INSTALL_DIR/headunit-updater.sh"
chmod +x "$INSTALL_DIR/headunit-updater.sh"

# Update the repo in the script
sed -i "s|YOUR_USERNAME/rx7-headunit|${GITHUB_REPO}|g" "$INSTALL_DIR/headunit-updater.sh"

# Install systemd services
echo "[4/6] Installing systemd services..."

# Updater service (runs on boot, before headunit starts)
sudo tee /etc/systemd/system/headunit-updater.service > /dev/null << EOF
[Unit]
Description=Headunit Auto-Updater (runs on boot)
After=network-online.target
Wants=network-online.target
Before=headunit.service

[Service]
Type=oneshot
ExecStartPre=/bin/bash -c 'for i in {1..30}; do ping -c1 github.com && break || sleep 1; done'
ExecStart=$INSTALL_DIR/headunit-updater.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Headunit app service
sudo tee /etc/systemd/system/headunit.service > /dev/null << 'EOF'
[Unit]
Description=RX7 Headunit Application
After=network.target graphical.target headunit-updater.service
Wants=graphical.target
Requires=headunit-updater.service

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
Environment=WAYLAND_DISPLAY=wayland-0
Environment=XDG_RUNTIME_DIR=/run/user/1000
ExecStart=/usr/bin/headunit
Restart=always
RestartSec=3

[Install]
WantedBy=graphical.target
EOF

# Enable services
echo "[5/6] Enabling services..."
sudo systemctl daemon-reload
sudo systemctl enable headunit-updater.service
sudo systemctl enable headunit.service

# Run first update
echo "[6/6] Downloading latest release..."
sudo "$INSTALL_DIR/headunit-updater.sh"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "The headunit will:"
echo "  - Check for updates on every boot (before app starts)"
echo "  - Auto-install new versions when connected to WiFi"
echo "  - Start the app automatically after update check"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status headunit          # Check app status"
echo "  sudo systemctl restart headunit         # Restart app"
echo "  sudo journalctl -u headunit -f          # View app logs"
echo "  sudo /opt/headunit/headunit-updater.sh  # Force update check"
echo "  cat /var/log/headunit-updater.log       # View update logs"
echo ""
echo "Rebooting in 5 seconds to start the headunit..."
sleep 5
sudo reboot
