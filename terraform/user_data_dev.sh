#!/bin/bash
set -e

# Update and install Docker & Docker Compose
yum update -y
yum install -y docker git
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# Install Docker Compose Plugin v2
mkdir -p /usr/libexec/docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/libexec/docker/cli-plugins/docker-compose
chmod +x /usr/libexec/docker/cli-plugins/docker-compose

# Create project directory
mkdir -p /app/sunotal
cd /app/sunotal

# Clone or pull codebase
git clone https://github.com/valivarthi007/sunotal_fullstk.git . || git pull origin main

# Launch all 11 microservices & containers via Docker Compose
docker compose -f docker-compose.yml up -d --build

echo "✅ Sunotal Single EC2 t3.medium ($30/mo) Cluster Ready!"
