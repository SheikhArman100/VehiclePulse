# Multi-stage production build for Next.js standalone App
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm install

# Copy application source
COPY . ./

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Production runner image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache dumb-init

# Copy static assets and standalone server bundle
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Ensure non-root execution
RUN chown -R node:node /app
USER node

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

