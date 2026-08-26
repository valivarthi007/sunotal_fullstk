# 03. Kubernetes (EKS) Operations, Manifests & Cluster Management Guide

Welcome to the **Sunotal Kubernetes (EKS) Master Guide**. This document provides an exhaustive, educational, and operational manual for deploying, managing, monitoring, and troubleshooting Sunotal on **Amazon Elastic Kubernetes Service (EKS)**.

---

## 📖 Table of Contents
1. [Kubernetes 101: Core Concepts for Beginners](#1-kubernetes-101-core-concepts-for-beginners)
2. [Manifest Architecture & K8s Resource Kinds](#2-manifest-architecture--k8s-resource-kinds)
3. [Exhaustive Manifest File Templates & Line-by-Line Breakdown](#3-exhaustive-manifest-file-templates--line-by-line-breakdown)
4. [Master `kubectl` CLI Commands (CRUD Operations)](#4-master-kubectl-cli-commands-crud-operations)
5. [Kubernetes Log Auditing & Real-Time Monitoring](#5-kubernetes-log-auditing--real-time-monitoring)
6. [Cluster Debugging: Troubleshooting Pod Failures](#6-cluster-debugging-troubleshooting-pod-failures)
7. [Triage Runbook: What to Check if a Kubernetes Service is Down](#7-triage-runbook-what-to-check-if-a-kubernetes-service-is-down)

---

## 1. Kubernetes 101: Core Concepts for Beginners

### What is Kubernetes?
Kubernetes (often abbreviated as **K8s**) is an enterprise container orchestration platform that automates the deployment, scaling, load balancing, health monitoring, and management of containerized applications.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KUBERNETES EKS CLUSTER                          │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      NAMESPACE: sunotal                        │   │
│   │                                                                │   │
│   │   [Ingress] ──> [Service: auth] ──> [Deployment: auth (Pod)]   │   │
│   │   [Ingress] ──> [Service: user] ──> [Deployment: user (Pod)]   │   │
│   │                                                                │   │
│   │   [ConfigMap: sunotal-config]    [Secret: sunotal-secrets]     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Concepts & Terminology
- **Pod**: The smallest deployable unit in Kubernetes. A Pod wraps one or more Docker containers that share network IP and storage.
- **Deployment**: A controller that manages declarative updates for Pods. It ensures the specified number of Pod replicas are always running.
- **Service**: An abstraction that defines a logical set of Pods and a policy by which to access them (provides stable ClusterIP DNS).
- **Ingress**: An API object that manages external access to services, typically HTTP/HTTPS routing via AWS Application Load Balancer.
- **ConfigMap**: Key-value store for non-sensitive configuration data (`NODE_ENV`, `S3_BUCKET_NAME`).
- **Secret**: Key-value store for sensitive data (`DATABASE_URL`, `SESSION_SECRET`).
- **Job**: Executes a batch task to completion (e.g. running database migrations `pnpm run db:push`).
- **Liveness Probe**: Checks if container is alive. If probe fails, K8s restarts container.
- **Readiness Probe**: Checks if container is ready to accept HTTP traffic. If probe fails, K8s removes Pod IP from Service endpoints.

---

## 2. Manifest Architecture & K8s Resource Kinds

| Kind | File Path | Purpose in Sunotal |
| :--- | :--- | :--- |
| `Namespace` | `k8s/00-namespace.yaml` | Creates isolated environment namespace `sunotal`. |
| `ConfigMap` | `k8s/01-configmap-secret.yaml` | Stores environment configuration (`NODE_ENV`, `FRONTEND_URL`, `S3_BUCKET_NAME`). |
| `Secret` | `k8s/01-configmap-secret.yaml` | Stores database credentials (`DATABASE_URL`, `SESSION_SECRET`). |
| `Deployment` | `k8s/02-deployments.yaml` | Defines container images, resource requests/limits, and health probes for 5 microservices. |
| `Service` | `k8s/03-services.yaml` | Defines stable ClusterIP network endpoints for microservices. |
| `Ingress` | `k8s/04-ingress.yaml` | Configures HTTP routing rules for AWS Load Balancer Controller. |
| `Job` | `k8s/05-db-migration-job.yaml` | Runs automated database DDL migrations (`pnpm run db:push`). |

---

## 3. Exhaustive Manifest File Templates & Line-by-Line Breakdown

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

---

## 4. Master `kubectl` CLI Commands (CRUD Operations)

```bash
# 1. CREATE / APPLY RESOURCES
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap-secret.yaml
kubectl apply -f k8s/03-services.yaml
kubectl apply -f k8s/04-ingress.yaml
kubectl apply -f k8s/02-deployments.yaml

# 2. READ / QUERY RESOURCES
kubectl get namespaces
kubectl get pods -n sunotal -o wide
kubectl get services -n sunotal
kubectl get ingress -n sunotal
kubectl get configmap,secret -n sunotal

# Detailed Inspection
kubectl describe pod -l app=sunotal-auth -n sunotal
kubectl describe service sunotal-auth -n sunotal
kubectl describe ingress sunotal-ingress -n sunotal

# 3. UPDATE / ROLLOUT RESTART
kubectl rollout restart deployment/sunotal-auth -n sunotal
kubectl rollout status deployment/sunotal-auth -n sunotal

# 4. DELETE RESOURCES
kubectl delete job sunotal-db-migration -n sunotal --ignore-not-found
kubectl delete pod -l app=sunotal-auth -n sunotal
```

---

## 5. Kubernetes Log Auditing & Real-Time Monitoring

```bash
# 1. View Live Tail Logs for a Deployment
kubectl logs deployment/sunotal-auth -n sunotal --tail=100 -f

# 2. View Logs for Previous Terminated Container (Useful for CrashLoopBackOff)
kubectl logs -l app=sunotal-auth -n sunotal --previous

# 3. Resource Monitoring (CPU & Memory Top Usage)
kubectl top pods -n sunotal
kubectl top nodes

# 4. Execute Shell inside Running Pod
kubectl exec -it deployment/sunotal-auth -n sunotal -- sh
```

---

## 6. Cluster Debugging: Troubleshooting Pod Failures

### 1. `CrashLoopBackOff`
- **Cause**: Application process crashes immediately after starting.
- **Fix**: Run `kubectl logs <pod_name> -n sunotal --previous`. Check for database connection errors or missing environment variables (`ENOTFOUND`, `DATABASE_URL`).

### 2. `ImagePullBackOff` / `ErrImagePull`
- **Cause**: Kubernetes cannot download Docker image from ECR.
- **Fix**: Run `kubectl describe pod <pod_name> -n sunotal`. Check if image repository URI or tag exists in ECR.

### 3. `OOMKilled` (Out Of Memory)
- **Cause**: Container exceeded its memory limit (`limits.memory`).
- **Fix**: Edit `k8s/02-deployments.yaml` and increase memory limit from `256Mi` to `512Mi`.

---

## 7. Triage Runbook: What to Check if a Kubernetes Service is Down

1. **Check Pod Status**: `kubectl get pods -n sunotal`. Look for non-`Running` status.
2. **Inspect Events**: Run `kubectl get events -n sunotal --sort-by='.metadata.creationTimestamp'`.
3. **Verify Target Group Health**: Run `aws elbv2 describe-target-health --target-group-arn <ARN>`.
4. **Verify Security Group Rules**: Ensure EKS Cluster Security Group allows incoming traffic from ALB Security Group on ports 80, 5001-5004.
