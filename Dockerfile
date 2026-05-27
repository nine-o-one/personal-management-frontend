# ----------------------------
# Stage 1: Build the Application
# ----------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the Angular application
RUN npm run build

# ----------------------------
# Stage 2: Serve the Application (CSR)
# ----------------------------
FROM nginx:alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist/personal-mgmt-app/browser /usr/share/nginx/html

# Copy a custom Nginx configuration to handle SPA routing (see below)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Default HTTP port)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]