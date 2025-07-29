# 🛠️ Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the source code and compile TypeScript
COPY . .
RUN npm run build
COPY private ./dist/private

# 🏗️ Stage 2: Run (Final Image)
FROM node:22-alpine
WORKDIR /app

# Copy compiled JavaScript from the build stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
# COPY --from=builder /app/.env ./
# COPY --from=builder /app/uploads ./uploads

# Expose the required port
EXPOSE 3000

# Start the application
CMD npm start