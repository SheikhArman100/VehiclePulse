FROM node:22-alpine AS builder

WORKDIR /app

# Copy package configurations and monorepo roots
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY workers/command-worker/ ./workers/command-worker/

# Install dependencies and build shared packages + command worker
RUN npm install
RUN npm run build --workspace=@vehicle-pulse/logger
RUN npm run build --workspace=@vehicle-pulse/config
RUN npm run build --workspace=@vehicle-pulse/event-contracts
RUN npm run build --workspace=@vehicle-pulse/shared
RUN npm run build --workspace=@vehicle-pulse/command-worker

# Production runner image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/workers/command-worker/package.json ./workers/command-worker/
COPY --from=builder /app/workers/command-worker/dist/ ./workers/command-worker/dist/

WORKDIR /app/workers/command-worker

CMD ["node", "dist/server.js"]
