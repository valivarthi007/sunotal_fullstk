#!/bin/bash
# Sunotal Backend EC2 Bootstrap Script (Amazon Linux 2023)
set -e

exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "===================================================="
echo "🚀 Starting Sunotal EC2 Backend Bootstrap"
echo "===================================================="

# 1. System Updates & Core Packages
dnf update -y
dnf install -y git docker htop curl

# Enable & Start Docker Service
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# 2. Install Node.js 20 & PM2
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
npm install -g pm2

# Install Docker Compose Standalone Plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# 3. Setup Project Codebase
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

if [ ! -d "sunotal_fullstk" ]; then
  git clone ${repo_url} sunotal_fullstk
fi

cd sunotal_fullstk

# 4. Set Environment Variables
cat << 'EOF' > /etc/environment
JWT_SECRET="${jwt_secret}"
MONGODB_URI="${mongodb_uri}"
AWS_REGION="${aws_region}"
S3_BUCKET="${s3_bucket}"
FRONTEND_ORIGIN="${frontend_origin}"
NODE_ENV="production"
EOF

# 5. Launch Microservices via Docker Compose
cd services
docker compose up -d --build

echo "===================================================="
echo "🎉 Sunotal EC2 Backend Bootstrap Completed!"
echo "===================================================="
