# 🔧 OptiPilot Bridge — Procédure d'installation

> À utiliser sur site **ou à distance via AnyDesk**.  
> Durée estimée : **10 à 15 minutes**.

---

## ✅ Prérequis

Avant de commencer, vérifier que le PC du magasin dispose de :

| Élément | Détail | Vérification |
|---|---|---|
| Windows 10 ou 11 | 64 bits | `winver` dans Rechercher |
| Node.js ≥ 18 | [nodejs.org](https://nodejs.org) | `node -v` dans PowerShell |
| SQL Server (Optimum) | Instance locale ou réseau | Optimum doit être lancé |
| Connexion Internet | Pour joindre le backend OptiPilot | — |

---

## 📦 Étape 1 — Copier le dossier bridge sur le PC

**Option A — Clé USB (sur site)**
1. Copier le dossier `bridge/` sur une clé USB
2. Le coller dans `C:\OptiPilot\bridge\`

**Option B — Téléchargement (à distance)**
1. Envoyer le lien de téléchargement (archive zip) à l'opticien
2. L'opticien dézippe dans `C:\OptiPilot\bridge\`

---

## ⚙️ Étape 2 — Créer le fichier `.env`

Dans le dossier `C:\OptiPilot\bridge\`, créer un fichier nommé `.env` (sans extension) avec le contenu suivant :

```env
# Connexion à la base SQL Server Optimum
DB_HOST=localhost
DB_PORT=1433
DB_NAME=OptimumDB
DB_USER=sa
DB_PASSWORD=MotDePasseSQL

# Token d'authentification (fourni par OptiPilot)
BRIDGE_TOKEN=TON_TOKEN_ICI

# URL du backend OptiPilot
BACKEND_URL=https://optipilot-backend.onrender.com

# Port local du bridge (ne pas modifier sauf conflit)
PORT=5174
```

> ⚠️ Remplacer `DB_NAME`, `DB_USER`, `DB_PASSWORD` par les vraies valeurs SQL Server du magasin.  
> Le `BRIDGE_TOKEN` est généré depuis la page **Configuration** d'OptiPilot.

### Comment trouver les infos SQL Server Optimum ?

- **Serveur** : généralement `localhost` ou `NOM_PC\SQLEXPRESS`
- **Base** : dans Optimum > À propos, ou demander au technicien Optimum
- **Identifiants** : fournis lors de l'installation d'Optimum

---

## 🚀 Étape 3 — Lancer l'installation

1. Ouvrir **PowerShell en tant qu'Administrateur**
   - Rechercher "PowerShell" > Clic droit > "Exécuter en tant qu'administrateur"

2. Se placer dans le dossier bridge :
   ```powershell
   cd "C:\OptiPilot\bridge"
   ```

3. Autoriser l'exécution des scripts (si nécessaire) :
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

4. Lancer l'installation :
   ```powershell
   .\install-service.ps1
   ```

Le script va automatiquement :
- Vérifier que Node.js est installé
- Compiler le bridge (`npm install` + `npm run build`)
- Créer une **tâche planifiée Windows** qui démarre automatiquement au boot
- Démarrer le bridge immédiatement
- Tester la connexion sur `http://localhost:5174/health`

---

## 🔍 Étape 4 — Vérifier que ça fonctionne

Ouvrir un navigateur sur le PC du magasin et aller sur :

```
http://localhost:5174/health
```

Réponse attendue :
```json
{ "status": "ok", "db": "connected" }
```

Si la réponse affiche `"db": "error"`, vérifier les identifiants SQL dans le `.env`.

---

## 🖥️ Étape 5 — Tester depuis la tablette

1. Sur la tablette OptiPilot, aller dans **Configuration**
2. Vérifier que le bridge est listé comme "Connecté"
3. Faire un test de synchronisation Optimum

---

## 🔄 Désinstallation (si besoin)

```powershell
cd "C:\OptiPilot\bridge"
.\install-service.ps1 -Uninstall
```

---

## 🛠️ Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `node` introuvable | Node.js pas installé | [nodejs.org](https://nodejs.org) → LTS |
| `dist/` absent après build | Erreur TypeScript | `npm run build` manuellement, lire l'erreur |
| `.env` absent | Fichier non créé | Créer le fichier `.env` (Étape 2) |
| `db: error` sur /health | Mauvais identifiants SQL | Vérifier DB_HOST / DB_USER / DB_PASSWORD |
| Bridge ne redémarre pas au boot | Tâche planifiée désactivée | Gestionnaire des tâches planifiées > OptiPilotBridge > Activer |
| Port 5174 occupé | Autre logiciel | Changer `PORT=5175` dans `.env` |

---

## 📡 Prise en main à distance (AnyDesk)

Si l'opticien est à distance :

1. Lui envoyer **AnyDesk Quick Support** : [anydesk.com/fr/downloads/thank-you](https://anydesk.com/fr/downloads/thank-you)
2. Il lance l'exécutable (aucune installation) et te donne son **code à 9 chiffres**
3. Tu prends la main et fais les étapes 2 à 5 toi-même
4. L'opticien reste devant son écran pendant toute la session

> Envoyer un mail avant la session : _"Je vais me connecter à votre PC le [date] à [heure] pour installer OptiPilot Bridge. Merci d'être présent."_

---

## 🗓️ Logiciels opticiens supportés

| Logiciel | Statut | Notes |
|---|---|---|
| **Optimum** (Veeva) | ✅ Connecté | Via SQL Server direct |
| **Winoptic** | 🔜 Prévu | Export CSV / API à confirmer |
| **Vision Pro** | 🔜 Prévu | Format base à analyser |
| **Ilog** | 🔜 Prévu | — |
| **ABsystem** | 🔜 Prévu | — |
