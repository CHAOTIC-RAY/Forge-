# Build stage
FROM node:22-slim AS build
WORKDIR /app

# Skip Electron binary download — not needed for server builds
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV ELECTRON_BUILDER_SKIP_DOWNLOAD=1

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm install --omit=dev
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
