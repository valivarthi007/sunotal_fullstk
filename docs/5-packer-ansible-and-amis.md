# 5. Base Machine Image Provisioning (Packer & Ansible)

This guide describes how the hardened golden base AMI is built using HashiCorp Packer and Ansible local provisioning.

---

## 1. Packer Pipeline Definition

The template located at `packer/packer.pkr.hcl`:
- Specifies the target AWS Region (`us-east-1` by default).
- Pulls the latest base canonical Ubuntu 22.04 LTS image.
- Declares the Ansible local provisioner block.
- Generates a custom AMI tag and exports metadata to `packer-manifest.json`.

---

## 2. Server Configuration Management (Ansible)

Ansible provisions software dependencies inside the builder instance. The playbook `packer/ansible/site.yml`:
- **Installs Essential Runtimes**: Node.js v20, `pnpm` (global), Docker, Git, and Nginx.
- **Configures UFW Firewalls**: Restricts incoming traffic, opening only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).
- **Hardens SSH Daemon**: Disables SSH password authentication, enforces public key auth, and prevents root login.
- **Prepares Application Directory**: Creates `/var/www/sunotal` and `/var/www/sunotal-backend` and changes ownership to the `ubuntu` deployment user.

---

## 3. Web Service Proxying (Nginx)

Nginx is configured to serve static assets and proxy API requests:
- **Frontend Assets**: Requests to `/` serve files directly from `/var/www/sunotal/dist`.
- **Backend API**: Requests to `/api/` are proxied to the PM2 backend service running at `http://127.0.0.1:5000`.

---

## 4. PM2 Daemon Persistence

To survive EC2 system restarts, the Node.js API is managed by PM2:
- **Daemon Configuration**:
  ```bash
  pm2 start dist/src/index.js --name sunotal-backend
  pm2 save
  ```
- **Systemd Autostart**: Links PM2 to systemd boot processes:
  ```bash
  sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
  ```
