FROM node:22-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all project files
COPY . .

# Expose port (default 3000)
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
