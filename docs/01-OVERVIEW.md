# Chapter 1: System Overview & Core Concepts

## 1. What is Sunotal?

**Sunotal** is an end-to-end B2B Agricultural Marketplace and Management Platform designed for the Indian agricultural market. It connects:
1. **Farmers / Vendors**: Who list their fresh produce, submit price quotations, track inventory, and view sales invoices.
2. **Customers / Buyers**: Who browse farm-fresh organic products (vegetables, fruits, grains, dairy, spices), add items to their cart, and place orders.
3. **Admins / Business Operators**: Who review vendor applications, approve quotations, monitor warehouse inventory, manage digital marketing banners, and inspect financial metrics on an administrative dashboard.

---

## 2. Core Concepts for Beginners (Plain English Analogies)

If you are coming from a non-IT background, here is how modern software applications work:

### A. Client vs. Server
- **Client (Frontend)**: This is what the user sees in their browser (buttons, text, images, forms). Think of it like the showroom of a shop. In Sunotal, the frontend is built using **React** and **TailwindCSS**.
- **Server (Backend)**: This is the kitchen or warehouse behind the scenes where logic is processed (checking passwords, calculating order totals, fetching data). In Sunotal, the backend consists of microservices built using **Node.js** and **Express**.

### B. Microservices vs. Monolith
- **Monolith**: One single massive computer program that handles everything. If one part crashes, the whole application goes down.
- **Microservices**: Splitting the application into small, independent specialized services:
  - **Auth Service (Port 5001)**: Handles user registration, login, and security tokens.
  - **Operations Service (Port 5002)**: Handles products, categories, banner advertisements, and image uploads.
  - **Inventory Service (Port 5003)**: Handles stock levels, product definitions, and order management.
  - **User Service (Port 5004)**: Handles user profiles, vendor applications, quotations, and invoices.

### C. Database
- **Database**: A secure, organized electronic filing cabinet. Sunotal uses **PostgreSQL**, an industry-standard relational database, managed via **Drizzle ORM** (a tool that lets JavaScript code interact with SQL database tables cleanly).

### D. Docker & Containers
- **Container (Docker)**: Imagine shipping goods in standardized shipping containers. A Docker container packages code along with all its required software dependencies so it runs identically on any computer or cloud server.

### E. Kubernetes (K8s) & AWS EKS
- **Kubernetes**: An automated container manager ("the ship captain"). If a container crashes, Kubernetes automatically restarts it. If traffic spikes, Kubernetes spawns additional containers.
- **AWS EKS (Elastic Kubernetes Service)**: Amazon Web Services' cloud service that runs Kubernetes for us automatically.

### F. Infrastructure as Code (Terraform)
- **Terraform**: Instead of manually logging into AWS and clicking buttons to create servers, Terraform lets us describe our entire infrastructure (networks, databases, servers) in code files (`.tf`). Running Terraform creates or updates the infrastructure automatically in minutes.

### G. CI/CD (Continuous Integration & Continuous Deployment)
- **CI/CD**: Automated pipelines (using **GitHub Actions**) that trigger whenever code is pushed to GitHub. The pipeline automatically checks for bugs, scans for security vulnerabilities, builds Docker containers, pushes them to AWS ECR, and deploys them to AWS EKS.

---

## 3. Full Technology Stack Summary

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite, TailwindCSS, Lucide Icons | Responsive, modern user interface for Buyers, Vendors, and Admins. |
| **Backend API** | Node.js 20, Express 5, TypeScript | 4 decoupled microservices handling business logic and REST APIs. |
| **Database** | PostgreSQL 16, Drizzle ORM | Relational database storing users, products, orders, inventory, and invoices. |
| **Containerization** | Docker, Nginx 1.27 Alpine, Node 20 Alpine | Standardized container images for frontend and backend services. |
| **Cloud Provider** | AWS (Amazon Web Services) | Cloud platform hosting compute, database, networking, and storage. |
| **Container Registry** | AWS ECR (Elastic Container Registry) | Private Docker registry storing built application images. |
| **Compute & Orchestration** | AWS EKS (Elastic Kubernetes Service) / AWS ECS | Production Kubernetes cluster running containerized application pods. |
| **Load Balancing & DNS** | AWS ALB, AWS Route53 | Routes public domain traffic (`https://sunotal.automateuniverse.space`) to active pods. |
| **Storage & CDN** | AWS S3, AWS CloudFront | Secure storage for invoice PDFs and product assets, cached globally via CDN. |
| **IaC** | Terraform 1.5+ | Automated infrastructure provisioning and lifecycle management. |
| **CI/CD** | GitHub Actions | Automated linting, testing, security scanning, image building, and deployment. |
