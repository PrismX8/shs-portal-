# Use Node.js LTS (Debian-based to get prebuilt sqlite3 binaries)
FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev --no-audit --progress=false

# Copy application files
COPY . .

# Create data directory for SQLite
RUN mkdir -p data

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]

