# 03. Kubernetes (EKS) Operations & Manifest Guide

This document details Kubernetes (EKS) deployment manifests, resources by `kind`, operational runbooks, and troubleshooting procedures for Sunotal.

---

## 3.a Kubernetes Manifests & Resource Kinds

| Kind | Purpose in Sunotal | Manifest File |
| :--- | :--- | :--- |
| `Namespace` | Logical isolation boundary (`sunotal`) for all resources. | `k8s/00-namespace.yaml` |
| `ConfigMap` | Non-sensitive runtime configuration variables (`NODE_ENV`, `FRONTEND_URL`, `S3_BUCKET_NAME`). | `k8s/01-configmap-secret.yaml` |
| `Secret` | Encrypted sensitive data (`DATABASE_URL`, `SESSION_SECRET`). | `k8s/01-configmap-secret.yaml` |
| `Deployment` | Manages Pod replicas, container images, rolling updates, and health probes. | `k8s/02-deployments.yaml` |
| `Service` | Exposes internal Pod IPs behind a stable ClusterIP DNS name. | `k8s/03-services.yaml` |
| `Ingress` | Defines external HTTP/HTTPS routing rules for AWS Load Balancer Controller. | `k8s/04-ingress.yaml` |
| `Job` | One-off batch execution pod for running database schema migrations (`pnpm run db:push`). | `k8s/05-db-migration-job.yaml` |

---

## 3.b Kubernetes Manifest Skeletons & Templates

### 1. `Deployment` Template (`k8s/02-deployments.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sunotal-auth
  namespace: sunotal
  labels:
    app: sunotal-auth
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sunotal-auth
  template:
    metadata:
      labels:
        app: sunotal-auth
    spec:
      containers:
        - name: auth
          image: 143797622495.dkr.ecr.us-east-1.amazonaws.com/sunotal-auth:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 5001
          envFrom:
            - configMapRef:
                name: sunotal-config
            - secretRef:
                name: sunotal-secrets
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /api/healthz
              port: 5001
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/healthz
              port: 5001
            initialDelaySeconds: 5
            periodSeconds: 5
```

### 2. `Service` Template (`k8s/03-services.yaml`)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sunotal-auth
  namespace: sunotal
spec:
  type: ClusterIP
  ports:
    - port: 5001
      targetPort: 5001
      protocol: TCP
      name: http
  selector:
    app: sunotal-auth
```

---

## 3.c `kubectl` CRUD Operations Commands

```bash
# 1. CREATE / APPLY
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap-secret.yaml
kubectl apply -f k8s/03-services.yaml
kubectl apply -f k8s/04-ingress.yaml
kubectl apply -f k8s/02-deployments.yaml

# 2. READ / QUERY
kubectl get pods -n sunotal -o wide
kubectl get svc -n sunotal
kubectl get ingress -n sunotal
kubectl get configmap,secret -n sunotal
kubectl describe pod -l app=sunotal-auth -n sunotal

# 3. UPDATE / ROLLOUT RESTART
kubectl rollout restart deployment/sunotal-auth -n sunotal
kubectl set image deployment/sunotal-auth auth=143797622495.dkr.ecr.us-east-1.amazonaws.com/sunotal-auth:v2 -n sunotal

# 4. DELETE / CLEANUP
kubectl delete job sunotal-db-migration -n sunotal --ignore-not-found
kubectl delete deployment sunotal-auth -n sunotal
```

---

## 3.d, 3.e & 3.f Kubernetes Troubleshooting, Monitoring & Logs

```bash
# 1. Log Auditing
kubectl logs deployment/sunotal-auth -n sunotal --tail=100 -f
kubectl logs -l app=sunotal-user -n sunotal --previous

# 2. Describe Events (Check CrashLoopBackOff or OOMKilled reasons)
kubectl get events -n sunotal --sort-by='.metadata.creationTimestamp'

# 3. Resource Monitoring (CPU & RAM usage)
kubectl top pods -n sunotal
kubectl top nodes

# 4. Execute Interactive Shell inside Pod
kubectl exec -it deployment/sunotal-auth -n sunotal -- sh
```

---

## 3.g Triage Runbook: What to Check if a Kubernetes Service is Down

1. **Check Pod Status**:
   `kubectl get pods -n sunotal` -> Identify if pod is `CrashLoopBackOff`, `ImagePullBackOff`, or `Pending`.
2. **Check Image Pull Error**:
   If `ImagePullBackOff`, check `kubectl describe pod <pod_name>` -> Verify AWS ECR authentication or image tag name.
3. **Check Secret & Environment Configuration**:
   If `CrashLoopBackOff`, verify `DATABASE_URL` in `sunotal-secrets`. Ensure host is valid RDS endpoint (`sunotal-postgres.cs1gq0a2wtpu.us-east-1.rds.amazonaws.com`).
4. **Check Readiness & Liveness Probes**:
   If pod is `Running` but `0/1 READY`, inspect `kubectl describe pod <pod_name>` -> Verify `/api/healthz` HTTP 200 response on port 5001/5002/5003/5004.
5. **Check AWS ALB Target Group Registration**:
   `aws elbv2 describe-target-health --target-group-arn <ARN>` -> Verify active pod IP is registered and state is `healthy`.
