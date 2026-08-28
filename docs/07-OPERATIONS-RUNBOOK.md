# Chapter 7: Operations Runbook & Layman's Operating Manual

This chapter is designed as a practical, step-by-step operating guide. Whether you are a system administrator, a developer, or a non-IT operator, follow these procedures to run, maintain, and troubleshoot Sunotal.

---

## 1. Day-to-Day Operating Procedures

### A. How to Deploy New Code Changes
1. Commit your changes to a local feature branch.
2. Push your branch to GitHub and open a Pull Request to `main`.
3. GitHub Actions will automatically run the **CI Pipeline** (linting, tests, security scans).
4. Merge the Pull Request into `main`.
5. The **CD Pipeline** will trigger automatically:
   - Builds new Docker images.
   - Pushes images to AWS ECR.
   - Runs database migrations.
   - Performs a zero-downtime rolling update on EKS.
   - Runs the 5-point post-deployment test suite.

### B. How to Check System Health
- **Public Website Check**: Open browser to `https://sunotal.automateuniverse.space`.
- **API Health Check**: Open `https://sunotal.automateuniverse.space/api/healthz`. Expected response:
  ```json
  {"status":"ok","service":"auth"}
  ```
- **Kubernetes Pod Health Check**:
  ```bash
  aws eks update-kubeconfig --name sunotal-cluster --region us-east-1
  kubectl get pods -n sunotal
  ```
  *All pods (`sunotal-frontend`, `sunotal-auth`, `sunotal-operations`, `sunotal-inventory`, `sunotal-user`) should show STATUS `Running` and RESTARTS `0`.*

### C. How to Scale Pods (Increase Server Capacity)
If traffic increases, increase the number of pod replicas:
```bash
# Scale frontend to 3 replicas
kubectl scale deployment/sunotal-frontend -n sunotal --replicas=3

# Scale auth service to 3 replicas
kubectl scale deployment/sunotal-auth -n sunotal --replicas=3
```

---

## 2. Comprehensive Troubleshooting Matrix

Here is the exact diagnostic matrix for resolving operational issues:

| Issue / Symptom | Root Cause | Step-by-Step Resolution |
| :--- | :--- | :--- |
| **`Test 1 [Frontend Webpage]: HTTP 000`** | Domain is unreachable or ALB target group has no healthy targets. | 1. Check ALB security group ingress permissions.<br>2. Run `kubectl get pods -n sunotal` to verify frontend pod is `Running`.<br>3. Run `aws elbv2 describe-target-health --target-group-arn <FRONTEND_TG_ARN>` to verify pod IP is registered. |
| **`error: timed out waiting for condition on jobs/sunotal-db-migration`** | Migration container crashed or hung waiting for interactive input. | 1. Check migration pod logs: `kubectl logs job/sunotal-db-migration -n sunotal`.<br>2. Ensure `package.json` `db:push` script includes `--force` flag.<br>3. Ensure `tsx` and `typescript` are under `dependencies` so they aren't pruned during Docker build. |
| **`ERR_PNPM_OUTDATED_LOCKFILE`** | `package.json` dependencies were modified without updating `pnpm-lock.yaml`. | Run `pnpm install` locally inside the service folder to sync lockfile, then commit and push `pnpm-lock.yaml`. |
| **`ERR_PNPM_IGNORED_BUILDS`** | `pnpm` blocked native build scripts during Docker build. | Ensure `pnpm install` in Dockerfile uses the `--ignore-scripts` flag (`RUN pnpm install --frozen-lockfile --ignore-scripts`). |
| **`ErrImagePull` / `ImagePullBackOff`** | EKS node cannot pull image from ECR, or image tag doesn't exist in ECR. | 1. Check if CI pipeline succeeded in pushing images to ECR.<br>2. Verify EKS node IAM role has `AmazonEC2ContainerRegistryReadOnly` policy attached. |
| **Database Connection Failure / `ECONNREFUSED`** | RDS database host changed or security group blocking port 5432. | 1. Discover active RDS host: `aws rds describe-db-instances --db-instance-identifier sunotal-postgres`.<br>2. Verify database security group allows inbound traffic from EKS node security group on port 5432. |

---

## 3. Emergency Disaster Recovery & Secret Rotation

### A. How to Perform Manual Database Schema Migration
If database migration needs to be executed manually against production RDS:
```bash
aws eks update-kubeconfig --name sunotal-cluster --region us-east-1
kubectl delete job sunotal-db-migration -n sunotal --ignore-not-found
kubectl apply -f k8s/05-db-migration-job.yaml
kubectl logs -f job/sunotal-db-migration -n sunotal
```

### B. How to Rotate Database Credentials / Secrets
1. Update `db_password` variable in `terraform/terraform.tfvars`.
2. Apply Terraform changes: `cd terraform && terraform apply -auto-approve`.
3. Update Kubernetes Secret (`k8s/01-configmap-secret.yaml`):
   ```bash
   kubectl apply -f k8s/01-configmap-secret.yaml
   ```
4. Perform rolling restart of all deployments:
   ```bash
   kubectl rollout restart deployment -n sunotal --all
   ```

---

## 4. Summary Layman Operating Checklist

- [ ] **Check Public App**: Navigate to `https://sunotal.automateuniverse.space`.
- [ ] **Inspect Kubernetes Cluster**: Run `kubectl get pods -n sunotal`.
- [ ] **Verify CI/CD Status**: Check GitHub repository Actions tab for green checkmarks.
- [ ] **Monitor Database**: Verify RDS CPU and connection metrics in AWS CloudWatch.
