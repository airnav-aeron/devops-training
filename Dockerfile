# Lightweight Node.js image
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Accept build version argument and set as environment variable
ARG BUILD_VERSION
ENV BUILD_VERSION=$BUILD_VERSION

# Copy dependency files first (better Docker layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the application source
COPY . .

# Document the application's listening port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
