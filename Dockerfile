# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* /app/

# Install dependencies
RUN npm install

# Copy source files needed for build
COPY build.js /app/
COPY views/ /app/views/
# Create assets directory structure (assets directory may not exist in repo)
# The build script handles missing assets gracefully
RUN mkdir -p /app/site/assets
COPY *.pdf /app/

# Build static site
RUN npm run build

# Production stage - serve static files with nginx
FROM nginx:alpine

# Copy built static site to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


