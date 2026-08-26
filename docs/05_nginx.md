# 05. Nginx Reverse Proxy & Web Server Masterclass

Welcome to the **Sunotal Nginx Reverse Proxy Master Guide**. This document provides an exhaustive, educational, and operational manual for configuring, managing, routing, and troubleshooting Nginx for Sunotal.

---

## 📖 Table of Contents
1. [Nginx 101: Core Concepts for Beginners](#1-nginx-101-core-concepts-for-beginners)
2. [Nginx Deployment Locations & Configuration Files](#2-nginx-deployment-locations--configuration-files)
3. [Master Nginx Process Management Commands](#3-master-nginx-process-management-commands)
4. [Line-by-Line Breakdown of `nginx.conf`](#4-line-by-line-breakdown-of-nginxconf)
5. [Request Processing Flow & Location Block Matching](#5-request-processing-flow--location-block-matching)
6. [Step-by-Step Guide to Add New Microservice Routes](#6-step-by-step-guide-to-add-new-microservice-routes)
7. [Nginx Troubleshooting & Diagnostic Runbook](#7-nginx-troubleshooting--diagnostic-runbook)

---

## 1. Nginx 101: Core Concepts for Beginners

### What is Nginx?
Nginx (pronounced "engine-x") is a high-performance web server, reverse proxy, load balancer, and HTTP cache.

### Key Roles in Sunotal
1. **Static Web Server**: Serves built production React single-page application (SPA) static files (`HTML`, `JS`, `CSS`, images) from `/usr/share/nginx/html`.
2. **Reverse Proxy Gateway**: Proxies incoming `/api/*` HTTP requests to appropriate microservices running on upstream container ports (`:5001`, `:5002`, `:5003`, `:5004`).
3. **Single-Page Application (SPA) Router**: Uses `try_files` to redirect non-file client routes (e.g. `/admin/products`) back to `index.html` so client-side React router (`Wouter`) handles navigation without 404 errors.

---

## 2. Nginx Deployment Locations & Configuration Files

- **Config File Path**: `nginx.conf` in project root or `/etc/nginx/conf.d/default.conf` inside the Docker container.
- **Static Assets Path**: `frontend/dist` or `/usr/share/nginx/html` inside the Docker container.
- **Log Files**: Access log `/var/log/nginx/access.log`, Error log `/var/log/nginx/error.log`.

---

## 3. Master Nginx Process Management Commands

```bash
# 1. Test Nginx Configuration File Syntax
nginx -t

# 2. Reload Nginx Configuration without Server Downtime
nginx -s reload

# 3. Stop Nginx Web Server
nginx -s stop

# 4. Start Nginx Web Server
nginx

# 5. Check Active Nginx Worker Processes
ps aux | grep nginx
```

---

## 4. Line-by-Line Breakdown of `nginx.conf`

```nginx
server {
    # Line 1: Listen on standard HTTP port 80
    listen 80;
    
    # Line 2: Define matching domain names
    server_name localhost sunotal.automateuniverse.space;

    # Line 3: Set root directory where static compiled frontend HTML/JS/CSS files reside
    root /usr/share/nginx/html;
    index index.html;

    # Line 4-5: Enable Gzip response compression for fast page load performance
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # REVERSE PROXY RULE 1: Forward Auth API requests to Auth Service Container (Port 5001)
    location /api/auth {
        proxy_pass http://sunotal-auth:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # REVERSE PROXY RULE 2: Forward User API requests to User Service Container (Port 5004)
    location /api/users {
        proxy_pass http://sunotal-user:5004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # REVERSE PROXY RULE 3: Forward Vendor API requests to User Service Container (Port 5004)
    location /api/vendors {
        proxy_pass http://sunotal-user:5004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # REVERSE PROXY RULE 4: Forward Admin API requests to User Service Container (Port 5004)
    location /api/admin {
        proxy_pass http://sunotal-user:5004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # SPA FALLBACK RULE: Route all non-static file client paths back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 5. Request Processing Flow & Location Block Matching

```
[ Request: GET https://sunotal.automateuniverse.space/api/admin/stats ]
                            │
                            ▼
           [ Nginx Evaluates Location Matching ]
                            │
                            ├─ Matches: `location /api/admin`
                            ▼
           [ Nginx Forwards Request to Upstream ]
           proxy_pass http://sunotal-user:5004/api/admin/stats
                            │
                            ▼
          [ User Service Returns JSON Response ]
```

---

## 6. Step-by-Step Guide to Add New Microservice Routes

To add a new payment gateway microservice `/api/payments` running on port `5005`:

1. Open `nginx.conf`.
2. Insert a new `location` block before `location /`:
   ```nginx
   location /api/payments {
       proxy_pass http://sunotal-payment:5005;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```
3. Test syntax: `nginx -t`.
4. Reload Nginx: `nginx -s reload`.

---

## 7. Nginx Troubleshooting & Diagnostic Runbook

| HTTP Status | Cause | Diagnostic Command | Fix |
| :--- | :--- | :--- | :--- |
| **502 Bad Gateway** | Upstream microservice container is down or not listening on port. | `curl http://sunotal-auth:5001/api/healthz` | Verify container status (`docker ps` / `kubectl get pods`) and restart container. |
| **504 Gateway Timeout** | Upstream microservice took longer than `proxy_read_timeout` (60s) to return response. | Check upstream logs (`docker logs sunotal-auth`). | Optimize database queries or increase `proxy_read_timeout 120s;`. |
| **404 Not Found on Page Refresh** | Missing `try_files $uri $uri/ /index.html;` in Nginx config. | Inspect Nginx error log (`/var/log/nginx/error.log`). | Ensure `try_files $uri $uri/ /index.html;` exists in `location /`. |
