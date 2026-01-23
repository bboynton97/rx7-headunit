#!/bin/bash
# headunit-updater.sh - Checks GitHub for new releases and installs them

set -e

# Configuration - UPDATE THESE
GITHUB_REPO="YOUR_USERNAME/rx7-headunit"  # Change to your repo
INSTALL_DIR="/opt/headunit"
VERSION_FILE="/opt/headunit/.version"
LOG_FILE="/var/log/headunit-updater.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check for network connectivity
check_network() {
    if ! ping -c 1 github.com &> /dev/null; then
        log "No network connectivity, skipping update check"
        exit 0
    fi
}

# Get latest release info from GitHub
get_latest_release() {
    curl -s "https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
}

# Get current installed version
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE"
    else
        echo "none"
    fi
}

# Download and install the .deb package
install_update() {
    local download_url="$1"
    local version="$2"
    local temp_deb="/tmp/headunit-update.deb"

    log "Downloading update from: $download_url"
    curl -L -o "$temp_deb" "$download_url"

    log "Installing update..."
    sudo dpkg -i "$temp_deb" || sudo apt-get install -f -y

    # Save version
    echo "$version" | sudo tee "$VERSION_FILE" > /dev/null

    # Restart the headunit service
    log "Restarting headunit service..."
    sudo systemctl restart headunit.service

    # Cleanup
    rm -f "$temp_deb"

    log "Update complete! Now running version: $version"
}

main() {
    log "=== Checking for headunit updates ==="

    check_network

    # Get latest release from GitHub
    release_json=$(get_latest_release)
    
    if [ -z "$release_json" ] || [ "$release_json" = "null" ]; then
        log "No releases found"
        exit 0
    fi

    latest_version=$(echo "$release_json" | jq -r '.tag_name')
    current_version=$(get_current_version)

    log "Current version: $current_version"
    log "Latest version: $latest_version"

    if [ "$latest_version" = "$current_version" ]; then
        log "Already up to date"
        exit 0
    fi

    # Find the ARM64 .deb asset
    download_url=$(echo "$release_json" | jq -r '.assets[] | select(.name | endswith(".deb")) | .browser_download_url' | head -1)

    if [ -z "$download_url" ] || [ "$download_url" = "null" ]; then
        log "No .deb package found in release"
        exit 1
    fi

    log "New version available! Updating..."
    install_update "$download_url" "$latest_version"
}

main "$@"
