FROM node:20-alpine
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.backend.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

# Générer le client Prisma
RUN npx prisma generate

# Copier le code source
COPY backend ./backend
COPY src/lib ./src/lib

# Compiler TypeScript
RUN npx tsc --project tsconfig.backend.json --outDir dist/backend

EXPOSE 4000

CMD ["node", "dist/backend/backend/server.js"]
