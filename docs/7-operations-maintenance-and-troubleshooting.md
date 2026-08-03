# 7. Operational Runbook, Maintenance & Support

This guide covers runtime operational support, database backup procedures, SSL rotations, and common troubleshooting steps.

---

## 1. Daily Support & Monitoring

### Reviewing PM2 Process Logs
- Monitor active API requests and node server standard outputs:
  ```bash
  pm2 logs sunotal-backend
  ```
- View process status, memory overheads, and restart counters:
  ```bash
  pm2 list
  ```

### Nginx Web Traffic Audits
- Check incoming load-balanced web requests and reverse proxy errors:
  ```bash
  sudo tail -n 100 /var/log/nginx/access.log
  sudo tail -n 100 /var/log/nginx/error.log
  ```

---

## 2. Backup & Recovery Operations

### PostgreSQL Backups
- Execute a database SQL schema and data dump:
  ```bash
  docker exec -t sunotal-postgres pg_dump -U sunotal -d sunotal > /home/ubuntu/backups/sunotal-backup-$(date +%F).sql
  ```
- Copy the generated backup dump file to the secure S3 backup prefix:
  ```bash
  aws s3 cp /home/ubuntu/backups/sunotal-backup-*.sql s3://jcs-raju-sunotal-final/backups/
  ```

### PostgreSQL Recovery
- Restore the database dump into the active PostgreSQL container:
  ```bash
  cat backup.sql | docker exec -i sunotal-postgres psql -U sunotal -d sunotal
  ```

---

## 3. SSL/TLS Certificate Rotations

To rotate certificates on the Load Balancer (ALB):
1. Request or upload the new domain certificate inside **AWS Certificate Manager (ACM)**.
2. Copy the newly issued Certificate ARN.
3. Update the `ssl_certificate_arn` variable inside `terraform/terraform.tfvars`.
4. Deploy the infrastructure change to bind the new certificate:
   ```bash
   terraform apply -target=module.cdn
   ```

---

## 4. Troubleshooting Common Errors

### Error: Nginx returns 502 Bad Gateway
- **Cause**: Nginx is running, but the Node.js Express backend process is stopped or crashed.
- **Resolution**: SSH into the EC2 app server, check PM2 process lists, and restart the daemon:
  ```bash
  pm2 list
  pm2 restart sunotal-backend
  ```

### Error: Database connection refused / Timeout
- **Cause**: The PostgreSQL Docker container is stopped or the system disk is full.
- **Resolution**: Check running Docker processes and disk usage:
  ```bash
  docker ps -a
  df -h
  docker compose up -d db
  ```
