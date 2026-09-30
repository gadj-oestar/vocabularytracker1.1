// Configuration de Prisma : où est le schéma, où ranger les migrations, et comment joindre la base.
import 'dotenv/config' // charge le fichier .env (il contient l'adresse et le mot de passe de la base)
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // DATABASE_URL vient du fichier .env, jamais écrit en clair dans le code (règle de sécurité)
    url: env('DATABASE_URL'),
  },
})
