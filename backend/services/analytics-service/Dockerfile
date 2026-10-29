FROM node:22-alpine AS builder

WORKDIR /app

# Copy package configurations and monorepo roots
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY services/analytics-service/ ./services/analytics-service/

# Install dependencies and build shared packages + analytics service
RUN npm install
RUN npm run build --workspace=@vehicle-pulse/logger
RUN npm run build --workspace=@vehicle-pulse/config
RUN npm run build --workspace=@vehicle-pulse/event-contracts
RUN npm run build --workspace=@vehicle-pulse/shared
ARG POSTGRES_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV POSTGRES_URL=${POSTGRES_URL}
RUN npm run build --workspace=@vehicle-pulse/analytics-service


# Production runner image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/services/analytics-service/package.json ./services/analytics-service/
COPY --from=builder /app/services/analytics-service/dist/ ./services/analytics-service/dist/
COPY --from=builder /app/services/analytics-service/prisma/ ./services/analytics-service/prisma/
COPY --from=builder /app/services/analytics-service/prisma.config.ts ./services/analytics-service/prisma.config.ts


WORKDIR /app/services/analytics-service

EXPOSE 4002

CMD ["node", "dist/server.js"]
