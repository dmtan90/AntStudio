# Build Stage
# ==========================================
# BUILD STAGE
# ==========================================
FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ==========================================
# PRODUCTION STAGE (NGINX)
# ==========================================
FROM nginx:stable-alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration for Vue Router (SPA)
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    location / {\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    try_files $uri $uri/ /index.html;\n\
    }\n\
    error_page 500 502 503 504 /50x.html;\n\
    location = /50x.html {\n\
    root /usr/share/nginx/html;\n\
    }\n\
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
