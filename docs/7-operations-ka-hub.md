# 7. Operational Knowledge Artifacts (KA) & Runbooks

This document contains step-by-step Knowledge Artifacts (KAs) and runbooks for support teams to monitor, troubleshoot, and maintain the Sunotal application, database, and infrastructure.

---

## 🔐 KA-01: Credentials & SSL Certificate Rotation

### Scenario
An SSL/TLS certificate is expiring, or database credentials must be rotated to comply with security policies.

### SSL Rotation Steps
1. **ACM Request**: Request or upload the new domain certificate inside **AWS ACM** (AWS Certificate Manager). Copy the new certificate ARN.
2. **Update Parameters**: Open `terraform/terraform.tfvars` and set the `ssl_certificate_arn` variable.
3. **Apply Update**: run Terraform targeting the Load Balancer module:
   ```bash
   cd terraform
   terraform init
   terraform apply -target=module.cdn -auto-approve
   ```

### DB Credentials Rotation Steps
1. **Update Terraform configuration**: Modify `db_password` inside `terraform/terraform.tfvars`.
2. **Apply Database Change**:
   ```bash
   terraform apply -target=module.database -auto-approve
   ```
3. **Update Application Configuration**: Update the database password secret in the GitHub repository environment settings (`DB_PASSWORD`). The next CD run will inject the new credential into the `.env` configuration file on the application server.

---

## 🗄️ KA-02: PostgreSQL Backup & Recovery operations

### Scenario
Database backups are required for maintenance tasks, or data must be restored from an S3 backup dump.

### Backup Execution
Execute this process from the Bastion host (which has network access to the RDS database instance):
1. **Identify RDS Host**:
   ```bash
   RDS_HOST=$(aws rds describe-db-instances --db-instance-identifier sunotal-postgres --query "DBInstances[0].Endpoint.Address" --output text)
   ```
2. **Generate Database Dump**:
   ```bash
   pg_dump -h $RDS_HOST -U sunotal -d sunotal -F c -b -v -f /tmp/sunotal-backup-$(date +%F).dump
   ```
3. **Upload to S3**:
   ```bash
   aws s3 cp /tmp/sunotal-backup-*.dump s3://jcs-raju-sunotal-final/backups/
   ```

### Recovery execution
To restore the database from a backup file:
1. **Download Backup**:
   ```bash
   aws s3 cp s3://jcs-raju-sunotal-final/backups/sunotal-backup-<DATE>.dump /tmp/restore.dump
   ```
2. **Restore Database**:
   ```bash
   pg_restore -h $RDS_HOST -U sunotal -d sunotal -v --clean --no-acl --no-owner /tmp/restore.dump
   ```

---

## 🖥️ KA-03: Process Recovery & Service Log Analysis

### Scenario
The application returns a `502 Bad Gateway` error or fails health checks.

### Diagnostic Actions
1. **SSH to App Instance**: Tunnel to the application host via the Bastion server:
   ```bash
   ssh -i ~/.ssh/id_rsa ubuntu@<PRIVATE_IP>
   ```
2. **Inspect PM2 Status**:
   ```bash
   pm2 status
   ```
3. **Analyze Service Logs**:
   ```bash
   pm2 logs sunotal-backend --lines 100
   ```
4. **Inspect Nginx Web logs**:
   ```bash
   sudo tail -n 100 /var/log/nginx/error.log
   ```

### Remediation
* **Restart Backend Service**:
  ```bash
  pm2 restart sunotal-backend --update-env
  ```
* **Restart Web Proxy**:
  ```bash
  sudo systemctl restart nginx
  ```

---

## 💾 KA-04: Disk Space Allocation & Cache Cleanup

### Scenario
The EC2 server disk space runs low, blocking application logs and caching mechanisms.

### Cleanup Actions
1. **Check Disk Allocation**:
   ```bash
   df -h
   ```
2. **Clear PM2 logs**:
   ```bash
   pm2 flush
   ```
3. **Clean System Cache**:
   ```bash
   sudo rm -rf /tmp/sunotal-artifacts/*
   sudo apt-get clean
   ```
4. **Remove Dangling Docker Images (if containerized)**:
   ```bash
   docker system prune -f --volumes
   ```
