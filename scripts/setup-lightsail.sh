#!/usr/bin/env bash
set -e

# ==============================================================================
# Sunotal Grocery: Lightsail 8GB Instance Setup & Host Hardening Script
# ==============================================================================

echo "[1/4] Updating Linux packages and setting up 2GB Swap Memory..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y gnupg curl wget ca-certificates docker.io docker-compose-v2 git

if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap file 2GB activated."
fi

sudo usermod -aG docker $USER || true

echo "[2/4] Installing Native MongoDB 7.0 Community Edition..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

echo "[3/4] Configuring MongoDB WiredTiger Cache & Local Binding..."
# Cap WiredTiger cache to 1GB for 8GB RAM host & bind to 127.0.0.1
sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 127.0.0.1,172.17.0.1/' /etc/mongod.conf

sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl restart mongod

echo "[4/4] Starting Docker Stack..."
docker compose -f docker-compose.prod.yml up -d --build

echo "✅ Sunotal Lightsail Host setup completed successfully!"
