FROM node:22-alpine AS builder

WORKDIR /app

# Copy package configurations and monorepo roots
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY services/telemetry-service/ ./services/telemetry-service/

# Install dependencies and build shared packages + telemetry service
RUN npm install
RUN npm run build --workspace=@vehicle-pulse/logger
RUN npm run build --workspace=@vehicle-pulse/config
RUN npm run build --workspace=@vehicle-pulse/event-contracts
RUN npm run build --workspace=@vehicle-pulse/shared
RUN npm run build --workspace=@vehicle-pulse/telemetry-service

# Production runner image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/services/telemetry-service/package.json ./services/telemetry-service/
COPY --from=builder /app/services/telemetry-service/dist/ ./services/telemetry-service/dist/

WORKDIR /app/services/telemetry-service

EXPOSE 4001

CMD ["node", "dist/server.js"]
