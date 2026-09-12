FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/nginx.conf

# Copy build outputs from client apps into Nginx html root
COPY ../user-app/dist /usr/share/nginx/html/user-app
COPY ../vendor-app/dist /usr/share/nginx/html/vendor-app
COPY ../admin-app/dist /usr/share/nginx/html/admin-app
COPY ../delivery-app/dist /usr/share/nginx/html/delivery-app
COPY ../support-app/dist /usr/share/nginx/html/support-app

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
