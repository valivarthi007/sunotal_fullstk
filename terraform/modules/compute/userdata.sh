#!/bin/bash
# Sunotal Backend EC2 Bootstrap Script (Amazon Linux 2023)
# Runs ONCE on first EC2 boot. Logs to /var/log/user-data.log
set -euo pipefail

exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "===================================================="
echo "🚀 Starting Sunotal EC2 Backend Bootstrap"
echo "   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================="

# ─── 1. System Updates & Core Packages ───────────────────────────────────────
echo "📦 Updating system packages..."
dnf update -y --quiet
dnf install -y --allowerasing git htop jq unzip

# ─── 2. Create Swap File (Stabilizes t3.small under memory pressure) ──────────
if [ ! -f /swapfile ]; then
  echo "💾 Creating 2GB swap file..."
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
  echo "✅ Swap activated"
fi

# ─── 3. Install & Configure Docker ───────────────────────────────────────────
echo "🐳 Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# Install Docker Compose Plugin (v2)
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
echo "✅ Docker $(docker --version) + Compose $(docker compose version) installed"

# ─── 4. Install Node.js 20 ───────────────────────────────────────────────────
echo "📦 Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
echo "✅ Node $(node --version) / npm $(npm --version)"

# ─── 5. Install AWS CLI v2 ───────────────────────────────────────────────────
if ! command -v aws &>/dev/null; then
  echo "☁️  Installing AWS CLI v2..."
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi

# ─── 6. Clone Project Codebase ───────────────────────────────────────────────
echo "📂 Setting up project codebase..."
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

if [ ! -d "sunotal_fullstk/.git" ]; then
  echo "Cloning repository..."
  git clone "${repo_url}" sunotal_fullstk
else
  echo "Repository already exists, pulling latest..."
  cd sunotal_fullstk
  git pull --rebase origin main || true
  cd ..
fi

cd sunotal_fullstk
chown -R ec2-user:ec2-user /home/ec2-user/app

# ─── 7. Set Environment Variables ────────────────────────────────────────────
echo "⚙️  Writing environment configuration..."
cat > /etc/environment << ENVEOF
JWT_SECRET="${jwt_secret}"
MONGODB_URI="${mongodb_uri}"
AWS_REGION="${aws_region}"
S3_BUCKET="${s3_bucket}"
FRONTEND_ORIGIN="${frontend_origin}"
NODE_ENV="production"
ENVEOF

# Also write .env file for Docker Compose
cat > /home/ec2-user/app/sunotal_fullstk/.env << ENVEOF
JWT_SECRET=${jwt_secret}
MONGODB_URI=${mongodb_uri}
AWS_REGION=${aws_region}
S3_BUCKET=${s3_bucket}
FRONTEND_ORIGIN=${frontend_origin}
NODE_ENV=production
ENVEOF
chown ec2-user:ec2-user /home/ec2-user/app/sunotal_fullstk/.env
chmod 600 /home/ec2-user/app/sunotal_fullstk/.env

# ─── 8. Pull TLS Certificates (if present in S3) ─────────────────────────────
CERTS_DIR="/home/ec2-user/app/sunotal_fullstk/certs"
mkdir -p "$CERTS_DIR"

if aws s3 ls "s3://${s3_bucket}/certs/" 2>/dev/null; then
  echo "🔐 Pulling TLS certs from S3..."
  aws s3 cp "s3://${s3_bucket}/certs/fullchain.pem" "$CERTS_DIR/fullchain.pem" 2>/dev/null || true
  aws s3 cp "s3://${s3_bucket}/certs/privkey.pem"   "$CERTS_DIR/privkey.pem"   2>/dev/null || true
fi

# If no certs from S3, create self-signed fallback so nginx can start
if [ ! -f "$CERTS_DIR/fullchain.pem" ]; then
  echo "⚠️  No certs found — generating self-signed fallback cert..."
  dnf install -y openssl
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERTS_DIR/privkey.pem" \
    -out "$CERTS_DIR/fullchain.pem" \
    -subj "/CN=sunotal.automateuniverse.space"
  echo "⚠️  Using self-signed cert — run cert renewal script to get real certs"
fi

chown -R ec2-user:ec2-user "$CERTS_DIR"
chmod 600 "$CERTS_DIR"/*.pem

# ─── 9. Configure Prometheus (if directory exists) ───────────────────────────
if [ ! -d "/home/ec2-user/app/sunotal_fullstk/prometheus" ]; then
  mkdir -p /home/ec2-user/app/sunotal_fullstk/prometheus
  cat > /home/ec2-user/app/sunotal_fullstk/prometheus/prometheus.yml << 'PROMEOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'sunotal-services'
    static_configs:
      - targets:
          - 'sunotal-auth:5001'
          - 'sunotal-operations:5002'
          - 'sunotal-inventory:5003'
          - 'sunotal-user:5004'
          - 'sunotal-vendor:5005'
          - 'sunotal-delivery:5006'
          - 'sunotal-support:5007'
PROMEOF
fi

# ─── 10. Launch Full Platform via Docker Compose ─────────────────────────────
echo "🐳 Launching Sunotal platform via Docker Compose..."
cd /home/ec2-user/app/sunotal_fullstk

# Login to ECR if ACCOUNT_ID is available
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ -n "$ACCOUNT_ID" ]; then
  echo "🔑 Logging into ECR..."
  aws ecr get-login-password --region "${aws_region}" \
    | docker login --username AWS --password-stdin \
      "$ACCOUNT_ID.dkr.ecr.${aws_region}.amazonaws.com" 2>/dev/null || true
fi

# Build and start all services
docker compose up -d --build 2>&1 | tail -20

echo "✅ Docker Compose stack launched"

# ─── 11. Configure CloudWatch Logs Agent ─────────────────────────────────────
if command -v amazon-cloudwatch-agent-ctl &>/dev/null 2>&1; then
  cat > /opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json << 'CWEOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          { "file_path": "/var/log/user-data.log", "log_group_name": "${log_group}", "log_stream_name": "user-data" },
          { "file_path": "/var/log/docker.log",    "log_group_name": "${log_group}", "log_stream_name": "docker"    }
        ]
      }
    }
  }
}
CWEOF
  amazon-cloudwatch-agent-ctl -a start 2>/dev/null || true
fi

echo "===================================================="
echo "🎉 Sunotal EC2 Backend Bootstrap COMPLETE!"
echo "   Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "   Platform URL: ${frontend_origin}"
echo "===================================================="
