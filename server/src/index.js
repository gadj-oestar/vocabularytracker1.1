// Point d'entrée : c'est ce fichier qu'on lance avec `npm run dev`.
import 'dotenv/config'
import app from './app.js'
import { assertAuthConfig } from './auth/token.js'

// On vérifie la configuration AVANT d'écouter : sans JWT_SECRET valide, on s'arrête avec un message clair.
assertAuthConfig()

const port = process.env.PORT ?? 3001

app.listen(port, () => {
  console.log(`Serveur démarré : http://localhost:${port}`)
})
