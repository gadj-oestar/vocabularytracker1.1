// Point d'entrée : c'est ce fichier qu'on lance avec `npm run dev`.
import 'dotenv/config'
import app from './app.js'

const port = process.env.PORT ?? 3001

app.listen(port, () => {
  console.log(`Serveur démarré : http://localhost:${port}`)
})
