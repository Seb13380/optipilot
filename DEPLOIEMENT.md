# 🚀 Guide de déploiement OptiPilot

## Architecture

```
Vercel (Frontend Next.js)  ←→  Railway (Backend Express)  ←→  Neon (PostgreSQL)
                                                              ↕
                                                  Bridge local (SQL Server Optimum)
```

---

## 1. Backend Express → Railway

### Étapes
1. Va sur [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Sélectionne le repo → configure **Root Directory** : `optipilot`
3. Dans **Settings > Build** :
   - Build Command : `npm install && npx prisma generate && npx tsc --project tsconfig.backend.json --outDir dist`  
   - Start Command : `node dist/backend/server.js`
4. Dans **Variables** (onglet Variables de Railway), ajoute :

```env
DATABASE_URL=<ta_url_neon>
JWT_SECRET=<ton_secret_jwt>
BACKEND_PORT=4000
NEXT_PUBLIC_APP_URL=https://ton-app.vercel.app
```

5. Après le déploiement, note l'URL Railway (ex: `https://optipilot-backend.up.railway.app`)

---

## 2. Frontend Next.js → Vercel

### Étapes
1. Va sur [vercel.com](https://vercel.com) → New Project → Import depuis GitHub
2. **Root Directory** : `optipilot`
3. Dans **Environment Variables**, ajoute :

```env
# Backend Railway
NEXT_PUBLIC_BACKEND_URL=https://optipilot-backend.up.railway.app
BACKEND_URL=https://optipilot-backend.up.railway.app

# Database Neon
DATABASE_URL=<ta_url_neon>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STANDARD=price_...
STRIPE_PRICE_PREMIUM=price_...

# OpenAI (scan ordonnance/mutuelle)
OPENAI_API_KEY=sk-...

# Bridge (localhost sur les tablettes en magasin — pas besoin en production)
NEXT_PUBLIC_BRIDGE_URL=http://localhost:5174
BRIDGE_URL=http://localhost:5174
```

4. Deploy → récupère l'URL Vercel (ex: `https://optipilot.vercel.app`)
5. Retourne dans Railway → ajoute `NEXT_PUBLIC_APP_URL=https://optipilot.vercel.app`

---

## 3. Stripe Webhook en production

```bash
# Dans le dashboard Stripe → Webhooks → Add endpoint
URL : https://optipilot.vercel.app/api/stripe/webhook
Events : checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
```

Remplace `STRIPE_WEBHOOK_SECRET` dans Vercel par le nouveau secret webhook.

---

## 4. Bridge local (en magasin)

Le bridge tourne en local sur le PC de l'opticien. Depuis la tablette sur le même réseau Wi-Fi :
```
NEXT_PUBLIC_BRIDGE_URL=http://192.168.1.XX:5174
```

> Voir `bridge/README.md` pour la configuration SQL Server.

---

## 5. Variables d'environnement locales (.env)

```env
# Prisma
DATABASE_URL="prisma+postgres://..."

# Backend local
NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"
BACKEND_URL="http://localhost:4000"

# Bridge local
NEXT_PUBLIC_BRIDGE_URL="http://localhost:5174"
BRIDGE_URL="http://localhost:5174"

# Stripe test
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_STANDARD="price_..."
STRIPE_PRICE_PREMIUM="price_..."

# OpenAI
OPENAI_API_KEY="sk-..."
```

---

## 6. Ordre de démarrage local

```bash
# Terminal 1 - Proxy Prisma
npx prisma dev

# Terminal 2 - Backend Express
npm run backend:dev

# Terminal 3 - Frontend Next.js
npm run dev

# Terminal 4 - Bridge (si SQL Server disponible)
cd bridge && npm run dev
```
