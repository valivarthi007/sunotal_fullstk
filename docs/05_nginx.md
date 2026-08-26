# 05. Nginx Reverse Proxy Guide

This document details Nginx reverse proxy configuration, request routing flow, location blocks, process management, and step-by-step route addition procedures.

---

## 5.1 Deployment Location & Process Management Commands

- **Config File Location**: `/etc/nginx/conf.d/default.conf` or project root `nginx.conf`.
- **Static Assets Root**: `/usr/share/nginx/html` (inside container) or `frontend/dist`.

### Essential Nginx Commands

```bash
# 1. Test Nginx Configuration Syntax
nginx -t

# 2. Reload Configuration without Downtime
nginx -s reload

# 3. Stop Nginx
nginx -s stop

# 4. Start Nginx
nginx

# 5. Check Nginx Process Status
ps aux | grep nginx
```

---

## 5.2 Current Application Nginx Configuration (`nginx.conf`)

```nginx
server {
    listen 80;
    server_name localhost sunotal.automateuniverse.space;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 1. API Reverse Proxy Pass rules
    location /api/auth {
        proxy_pass http://sunotal-auth:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/users {
        proxy_pass http://sunotal-user:5004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /api/vendors {
        proxy_pass http://sunotal-user:5004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /api/admin {
        proxy_pass http://sunotal-user:5004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # 2. Single Page Application (SPA) Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 5.3 Request Processing Flow & Adding New Routes

### How Requests are Processed
1. When a request arrives at `https://sunotal.automateuniverse.space/api/admin/stats`:
2. Nginx evaluates `location` block matching. `/api/admin` matches `location /api/admin`.
3. Nginx strips or passes headers and forwards the HTTP request to upstream service `http://sunotal-user:5004/api/admin/stats`.
4. When a user navigates to `/admin/products`:
5. Nginx evaluates `location /`. Nginx checks if file `/usr/share/nginx/html/admin/products` exists on disk.
6. Since it is a React client-side route, Nginx falls back to serving `index.html` via `try_files $uri $uri/ /index.html;`.
7. Client-side JavaScript (`Wouter` router) reads the URL path and renders the Admin Products component.

### Step-by-Step Guide to Add a New Route
To add a new payment microservice route `/api/payments` pointing to port 5005:

1. Open `nginx.conf`.
2. Add a new location block before `location /`:
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
