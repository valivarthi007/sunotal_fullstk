resource "aws_lightsail_instance" "sunotal" {
  name              = var.instance_name
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "ubuntu_24_04"
  bundle_id         = var.bundle_id
  key_pair_name     = var.key_pair_name

  user_data = <<-EOF
              #!/bin/bash
              set -e

              # 1. Allocate 2GB Swap Memory
              if [ ! -f /swapfile ]; then
                fallocate -l 2G /swapfile
                chmod 600 /swapfile
                mkswap /swapfile
                swapon /swapfile
                echo '/swapfile none swap sw 0 0' >> /etc/fstab
              fi

              # 2. Install Dependencies & Docker
              apt-get update && apt-get install -y gnupg curl wget ca-certificates docker.io docker-compose-v2 git
              systemctl enable docker
              systemctl start docker

              # 3. Install Native MongoDB 7.0 Community Edition
              curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
              echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
              apt-get update
              apt-get install -y mongodb-org

              # Configure MongoDB WiredTiger cache limit (1GB for 8GB RAM host) & local binding
              sed -i 's/bindIp: 127.0.0.1/bindIp: 127.0.0.1,172.17.0.1/' /etc/mongod.conf
              systemctl daemon-reload
              systemctl enable mongod
              systemctl restart mongod

              echo "Sunotal Lightsail Host Initialization Complete"
              EOF

  tags = merge(var.tags, {
    Name = var.instance_name
  })
}

resource "aws_lightsail_static_ip" "sunotal" {
  name = "sunotal-static-ip"
}

resource "aws_lightsail_static_ip_attachment" "sunotal" {
  static_ip_name = aws_lightsail_static_ip.sunotal.name
  instance_name  = aws_lightsail_instance.sunotal.name
}

resource "aws_lightsail_instance_public_ports" "sunotal" {
  instance_name = aws_lightsail_instance.sunotal.name

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
  }

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
  }
}
