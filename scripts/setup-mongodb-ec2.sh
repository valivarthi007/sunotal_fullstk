#!/usr/bin/env bash
set -e

# ==============================================================================
# Sunotal Grocery: Native MongoDB 7.0 Installation & Host Hardening Script
# ==============================================================================

echo "[1/4] Updating system packages and allocating 2GB Swap file..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y gnupg curl wget ca-certificates docker.io docker-compose-v2 git

# Allocate 2GB Swap file to prevent out-of-memory kernel panics on free-tier EC2
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap file 2GB created and activated successfully."
fi

# Enable docker for current user
sudo usermod -aG docker $USER || true

echo "[2/4] Installing Native MongoDB 7.0 Community Edition..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

echo "[3/4] Configuring MongoDB network binding to Localhost (127.0.0.1)..."
sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 127.0.0.1,172.17.0.1/' /etc/mongod.conf

sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl restart mongod

echo "[4/4] Verifying MongoDB systemd status..."
sudo systemctl status mongod --no-pager

echo "✅ Native MongoDB 7.0 installation and host hardening complete!"
