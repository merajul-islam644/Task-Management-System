# Build the Vite app, then serve the static output with a tiny Node server.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY scripts/serve.mjs ./scripts/serve.mjs
# Platforms that inject PORT win; 8080 is the default otherwise.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "scripts/serve.mjs"]
