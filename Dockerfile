# Stage 1: Install dependencies and build the app
# Use the full node:20 image to ensure build tools are available
FROM node:20 AS builder
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 2: Create the production image from a slim base
FROM node:20-slim
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Copy built app from the 'builder' stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
