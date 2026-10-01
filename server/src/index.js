// Point d'entrée : c'est ce fichier qu'on lance avec `npm run dev`.
import 'dotenv/config'
import app from './app.js'
import { assertAuthConfig } from './auth/token.js'

// On vérifie la configuration AVANT d'écouter : sans JWT_SECRET valide, on s'arrête avec un message clair.
assertAuthConfig()

// Pareil pour la base de données : sans adresse, rien ne pourrait fonctionner. Mieux vaut un message clair
// au démarrage qu'une erreur obscure à la première connexion d'un visiteur.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquante : indiquez l\'adresse de la base PostgreSQL (voir .env.example).')
}

// L'hébergeur (Render...) indique le port à utiliser dans la variable PORT ; sur votre PC, ce sera 3001.
const port = process.env.PORT ?? 3001

app.listen(port, () => {
  console.log(`Serveur démarré : http://localhost:${port}`)
})
