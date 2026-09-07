# Base Node.js Image
FROM node:20-alpine

# Working Directory
WORKDIR /app

# Install Production Dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Application Code
COPY . .

# Expose API Port
EXPOSE 5001

# Environment Variables
ENV PORT=5001

# Start Application
CMD ["node", "src/server.js"]
