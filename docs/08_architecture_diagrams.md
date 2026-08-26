# 08. System Architectural Visualizations & Diagrams Masterclass

Welcome to the **Sunotal Architecture Visualizations Guide**. This document contains production-grade Mermaid diagrams detailing the application, DevOps, AWS cloud, Docker, database, and Kubernetes cluster architectures of Sunotal.

---

## 📖 Table of Contents
1. [Application Architecture Diagram](#1-application-architecture-diagram)
2. [DevOps Pipeline Architecture Diagram](#2-devops-pipeline-architecture-diagram)
3. [AWS Cloud Infrastructure Diagram](#3-aws-cloud-infrastructure-diagram)
4. [Docker Container Topology Diagram](#4-docker-container-topology-diagram)
5. [Database Entity-Relationship (ER) Diagram](#5-database-entity-relationship-er-diagram)
6. [Kubernetes Cluster Topology Diagram](#6-kubernetes-cluster-topology-diagram)

---

## 1. Application Architecture Diagram

```mermaid
graph TD
    Client[Web Browser / React SPA] -->|HTTPS Requests| Ingress[AWS Application Load Balancer / Nginx]
    
    subgraph Microservices Layer
        Ingress -->|/api/auth| Auth[Auth Service :5001]
        Ingress -->|/api/operations, /api/banners, /api/products| Ops[Operations Service :5002]
        Ingress -->|/api/inventory, /api/orders| Inv[Inventory Service :5003]
        Ingress -->|/api/users, /api/vendors, /api/admin| User[User Service :5004]
        Ingress -->|/| Frontend[Frontend SPA :80]
    end

    subgraph Data & Storage Layer
        Auth --> RDS[(AWS RDS PostgreSQL)]
        Ops --> RDS
        Ops --> S3[AWS S3 Storage]
        Inv --> RDS
        User --> RDS
        User --> S3
    end
```

---

## 2. DevOps Pipeline Architecture Diagram

```mermaid
flowchart LR
    Developer[Developer Push] -->|Git Push main| GitHub[GitHub Repository]
    
    subgraph CI Pipeline - ci.yml
        GitHub --> Sonar[SonarCloud Analysis]
        GitHub --> TypeCheck[tsc Type Check]
        GitHub --> Test[Vitest Unit Tests]
        GitHub --> Trivy[Trivy Vulnerability Scan]
        GitHub --> DockerBuild[Docker Image Build]
        DockerBuild --> ECR[AWS ECR Registry]
    end
    
    subgraph CD Pipeline - cd.yml
        ECR --> DeployEKS[Deploy K8s Manifests]
        DeployEKS --> DBJob[DB Migration Job]
        DeployEKS --> TargetSync[ALB Target Group Auto-Sync]
        TargetSync --> TestSuite[Post-Deploy Test Suite]
    end

    TestSuite -->|HTTP 200 OK| Production[Live EKS Deployment]
```

---

## 3. AWS Cloud Infrastructure Diagram

```mermaid
graph TB
    Internet((Internet Users)) --> Route53[Route 53 DNS: sunotal.automateuniverse.space]
    Route53 --> CloudFront[AWS CloudFront CDN]
    CloudFront --> ALB[AWS Application Load Balancer]

    subgraph AWS VPC 10.10.0.0/16
        subgraph Public Subnets
            ALB
            NAT[NAT Gateway]
        end

        subgraph Private Subnets
            subgraph EKS Cluster
                AuthPod[sunotal-auth Pod]
                OpsPod[sunotal-operations Pod]
                InvPod[sunotal-inventory Pod]
                UserPod[sunotal-user Pod]
                FrontPod[sunotal-frontend Pod]
            end

            RDS[(AWS RDS PostgreSQL)]
        end
    end

    ALB -->|Target Group Port 5001| AuthPod
    ALB -->|Target Group Port 5002| OpsPod
    ALB -->|Target Group Port 5003| InvPod
    ALB -->|Target Group Port 5004| UserPod
    ALB -->|Target Group Port 80| FrontPod
    OpsPod --> S3Bucket[AWS S3 Bucket: jcs-raju-sunotal-final]
```

---

## 4. Docker Container Topology Diagram

```mermaid
graph LR
    subgraph Docker Network: sunotal-net
        FE[sunotal-frontend Container :80]
        AUTH[sunotal-auth Container :5001]
        OPS[sunotal-operations Container :5002]
        INV[sunotal-inventory Container :5003]
        USER[sunotal-user Container :5004]
        PG[(sunotal-postgres Container :5432)]
    end

    FE --> AUTH
    FE --> OPS
    FE --> INV
    FE --> USER
    AUTH --> PG
    OPS --> PG
    INV --> PG
    USER --> PG
```

---

## 5. Database Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ VENDORS : "has_profile"
    USERS ||--o{ ORDERS : "places"
    VENDORS ||--o{ VENDOR_QUOTATIONS : "submits"
    VENDOR_QUOTATIONS ||--o| INVOICES : "generates"
    PRODUCTS ||--o{ INVENTORY : "stocked_in"
    VENDORS ||--o{ INVENTORY : "supplies"
    CATEGORIES ||--o{ PRODUCT_DEFINITIONS : "contains"

    USERS {
        int id PK
        string email UK
        string password_hash
        string role
        boolean active
    }

    VENDORS {
        int id PK
        int user_id FK
        string produce
        string status
    }

    VENDOR_QUOTATIONS {
        int id PK
        int vendor_id FK
        string produce
        int quantity
        real price
        string status
    }

    INVENTORY {
        int id PK
        int product_id FK
        int vendor_id FK
        int quantity
    }
```

---

## 6. Kubernetes Cluster Topology Diagram

```mermaid
graph TB
    subgraph K8s Namespace: sunotal
        Ingress[sunotal-ingress]
        
        subgraph Services
            SvcAuth[Service: sunotal-auth :5001]
            SvcOps[Service: sunotal-operations :5002]
            SvcInv[Service: sunotal-inventory :5003]
            SvcUser[Service: sunotal-user :5004]
            SvcFront[Service: sunotal-frontend :80]
        end

        subgraph Deployments
            DepAuth[Deployment: sunotal-auth] --> PodAuth[Pod: sunotal-auth]
            DepOps[Deployment: sunotal-operations] --> PodOps[Pod: sunotal-operations]
            DepInv[Deployment: sunotal-inventory] --> PodInv[Pod: sunotal-inventory]
            DepUser[Deployment: sunotal-user] --> PodUser[Pod: sunotal-user]
            DepFront[Deployment: sunotal-frontend] --> PodFront[Pod: sunotal-frontend]
        end

        JobDB[Job: sunotal-db-migration]
    end

    Ingress --> SvcAuth
    Ingress --> SvcOps
    Ingress --> SvcInv
    Ingress --> SvcUser
    Ingress --> SvcFront
    SvcAuth --> PodAuth
    SvcOps --> PodOps
    SvcInv --> PodInv
    SvcUser --> PodUser
    SvcFront --> PodFront
```
