# Nginx Architecture, Configuration Deep Dive & Tutorial

This document explains the Nginx configuration used in the **Sunotal Farms** frontend container, how Nginx operates as a static file server and reverse proxy, and provides a tutorial on core Nginx directives.

---

## Part 1: Sunotal Frontend `nginx.conf` Breakdown

The frontend service uses Nginx 1.27 Alpine inside its Docker container to serve the compiled React SPA assets and handle client-side HTML5 history routing.

```nginx
events { 
    worker_connections 1024; 
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    client_max_body_size 10M;

    sendfile on;
    keepalive_timeout 65;

    # Gzip Compression for fast delivery of JS and CSS bundles
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    server {
        listen 80;
        server_name localhost;

        root /usr/share/nginx/html;
        index index.html;

        # Serve static assets with caching
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }

        # Single Page Application (SPA) Fallback Route
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### Line-by-Line Directive Analysis:

1. `worker_connections 1024;`:
   - Sets the maximum number of simultaneous connections that each worker process can handle. Combined with 1 worker, allows 1,024 concurrent requests.

2. `include /etc/nginx/mime.types;`:
   - Maps file extensions (`.js`, `.css`, `.html`, `.svg`, `.json`, `.woff2`) to their corresponding HTTP `Content-Type` headers so browsers parse scripts and styles properly.

3. `client_max_body_size 10M;`:
   - Prevents `413 Request Entity Too Large` errors when users upload product images or banners up to 10 MB.

4. `sendfile on;`:
   - Enables Linux kernel `sendfile()` system call to transfer static files directly from disk to the network socket without copying data into user-space memory, maximizing I/O performance.

5. `gzip on;`:
   - Compresses text-based assets (JS bundles, CSS files) on-the-fly, reducing network payload by up to 70% for faster mobile load times.

6. `location / { try_files $uri $uri/ /index.html; }`:
   - **Crucial for Single Page Applications:** When a user navigates directly to `https://sunotal.automateuniverse.space/admin/products` or `/vendor`, Nginx checks if a file `/admin/products` exists on disk. Since it is a client-side React route, Nginx falls back to serving `index.html`. React and Wouter router take over client-side navigation.

---

## Part 2: Nginx as a Reverse Proxy Tutorial

In development or monolithic mode, Nginx can route API requests directly to upstream application servers.

```nginx
server {
    listen 80;
    server_name sunotal.local;

    # 1. Reverse proxy all /api requests to Express Node.js backend
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;

        # Preserve client headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 2. Serve static uploads
    location /uploads/ {
        alias /var/www/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # 3. Frontend SPA
    location / {
        root /var/www/frontend;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Part 3: Troubleshooting Common Nginx Errors

| HTTP Status / Error | Root Cause | Fix |
|---|---|---|
| `404 Not Found` on page reload (e.g. `/profile`) | Nginx trying to find `/profile` as a physical file on disk | Add `try_files $uri $uri/ /index.html;` inside `location /` |
| `413 Request Entity Too Large` | Uploading image greater than default 1MB | Increase `client_max_body_size 10M;` in `http` or `server` block |
| `502 Bad Gateway` | Upstream Node.js process crashed or port mismatch | Verify upstream service is running and listening on specified port |
| `MIME type ('text/html') is not executable` | Missing `mime.types` or file missing leading to 404 falling back to `index.html` | Verify static file path and `include /etc/nginx/mime.types;` |
