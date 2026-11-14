# Base Node.js Image
FROM node:20-alpine

# Working Directory
WORKDIR /app

# Install Production Dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Application Code
COPY . .

# Expose API Port
EXPOSE 5000

# Production Environment
ENV NODE_ENV=production
ENV PORT=5000

# Start Application
CMD ["node", "src/server.js"]
