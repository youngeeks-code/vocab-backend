# --- frontend build ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- git metadata: bakes in whatever commit was actually checked out when this
# image was built, so the running app can be checked against GitHub after a deploy ---
FROM alpine:3.20 AS gitinfo
RUN apk add --no-cache git
WORKDIR /repo
COPY .git ./.git
RUN git rev-parse --short HEAD > /commit.txt

# --- backend runtime ---
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src/ ./src/
COPY --from=frontend-build /app/frontend/dist ./public
COPY --from=gitinfo /commit.txt ./commit.txt

EXPOSE 4000
CMD ["node", "src/index.js"]
