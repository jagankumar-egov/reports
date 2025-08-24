FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files first for better caching
COPY package*.json yarn.lock ./

# Install all dependencies (including dev for build)
RUN yarn install --frozen-lockfile

# Copy source code and build
COPY . .
RUN yarn build

# Remove dev dependencies after build
RUN yarn install --production --frozen-lockfile

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create logs directory and set permissions
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]