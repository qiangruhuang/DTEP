FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN python3 scripts/restore_db.py --force
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/db/custom.db ./db/custom.db.seed
COPY deploy/app-entrypoint.sh /usr/local/bin/dtep-entrypoint
RUN chmod +x /usr/local/bin/dtep-entrypoint
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/dtep-entrypoint"]
