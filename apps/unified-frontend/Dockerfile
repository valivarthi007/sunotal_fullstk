FROM nginx:1.25-alpine

COPY apps/unified-frontend/nginx.conf /etc/nginx/nginx.conf

# Copy build outputs from client apps into Nginx html root
COPY apps/user-app/dist /usr/share/nginx/html/user-app
COPY apps/vendor-app/dist /usr/share/nginx/html/vendor-app
COPY apps/admin-app/dist /usr/share/nginx/html/admin-app
COPY apps/delivery-app/dist /usr/share/nginx/html/delivery-app
COPY apps/support-app/dist /usr/share/nginx/html/support-app

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
