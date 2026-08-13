# 8. Test Server Infrastructure & Deployment

This document describes the design, configuration, provisioning, and operational workflows of the staging/test server environment for the Sunotal E-Commerce platform.

---

## 1. Role of the Test Server
The Test Server is a dedicated EC2 instance running in the AWS environment. Unlike the production cluster which uses a containerized serverless Fargate topology, the Test Server runs a **monolithic deployment** model. It serves as the staging environment to verify:
* Monolithic backend compilation and server execution (on Port `5000`).
* Local PostgreSQL database persistence (running inside Docker on the host).
* Database migration operations (`db:push`) and seed execution (`db:seed`).
* Security checks and vulnerability analysis (running Trivy scans).

---

## 2. Infrastructure Specifications
The Test Server is automatically provisioned via the `test_server` module in Terraform:
* **Resource Type**: `aws_instance.test_server` (EC2)
* **Instance Size**: `t3.micro` (fully compatible with the AWS Free Tier capacity).
* **Base OS**: Ubuntu Jammy 22.04 LTS (`ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*`).
* **Subnet Placement**: Deployed in a public subnet (`public_subnet_1_id`) to ensure accessibility for CI/CD deployment runners.
* **Network Association**: Dynamic public IP assignment enabled (`associate_public_ip_address = true`).

---

## 3. Network Ports & Firewall Rules
The instance is protected by the `sunotal-test-server-sg` security group. It allows incoming traffic only on specific ports, restricted by default to allowed IP CIDR blocks (`allowed_cidr_blocks`):

| Port | Protocol | Purpose |
| :--- | :--- | :--- |
| **`22`** | TCP | SSH shell access for CI/CD deployments and terminal maintenance. |
| **`3000`** | TCP | Web access for the frontend development server and UI checks. |
| **`5000`** | TCP | Direct access to the monolithic backend Express API endpoint. |

---

## 4. Bootstrapping & User Data
During the initial launch of the EC2 instance, the following cloud-init user data script runs as root to provision the server with all necessary runtimes:

```bash
#!/bin/bash
apt-get update -y
apt-get install -y docker.io git curl
systemctl start docker
systemctl enable docker

# Install Node.js 20 LTS & pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pnpm

# Install Trivy for vulnerability scanning
apt-get install -y wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | tee /etc/apt/sources.list.d/trivy.list
apt-get update
apt-get install -y trivy
```

---

## 5. Deployment Lifecycle
1. **GitHub Runner**: On code changes, the Runner packages the workspace assets.
2. **SSH Connection**: Authenticates securely using the repository secret `EC2_SSH_KEY`.
3. **Artifact Delivery**: Build packages are pushed to the server, compiled, and executed.
4. **Validation**: Migration queries are executed against the database and HTTP endpoints are verified.
