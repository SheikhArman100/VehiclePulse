FROM node:22-alpine AS builder

WORKDIR /app

# Copy package configurations and monorepo roots
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY services/alert-service/ ./services/alert-service/

# Install dependencies and build shared packages + alert service
RUN npm install
RUN npm run build --workspace=@vehicle-pulse/logger
RUN npm run build --workspace=@vehicle-pulse/config
RUN npm run build --workspace=@vehicle-pulse/event-contracts
RUN npm run build --workspace=@vehicle-pulse/shared
ARG MYSQL_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"
ENV MYSQL_URL=${MYSQL_URL}
RUN npm run build --workspace=@vehicle-pulse/alert-service


# Production runner image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/services/alert-service/package.json ./services/alert-service/
COPY --from=builder /app/services/alert-service/dist/ ./services/alert-service/dist/
COPY --from=builder /app/services/alert-service/prisma/ ./services/alert-service/prisma/
COPY --from=builder /app/services/alert-service/prisma.config.ts ./services/alert-service/prisma.config.ts

WORKDIR /app/services/alert-service

EXPOSE 4003

CMD ["node", "dist/server.js"]
