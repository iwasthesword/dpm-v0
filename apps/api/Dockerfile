FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy all package files first
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN pnpm install

# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 3001

CMD ["pnpm", "dev"]
