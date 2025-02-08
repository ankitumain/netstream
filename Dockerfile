# Stage 1: Install dependencies
FROM node:18 as builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y ffmpeg

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --only=production

# Copy the entire project
COPY . .

# Stage 2: Create a lightweight final image
FROM node:18
WORKDIR /app

# Copy dependencies from the builder stage
COPY --from=builder /app /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port for Railway
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
