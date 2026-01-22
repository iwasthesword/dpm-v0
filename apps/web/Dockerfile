FROM node:20-alpine

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

# Copy web source code
COPY apps/web ./apps/web

WORKDIR /app/apps/web

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
