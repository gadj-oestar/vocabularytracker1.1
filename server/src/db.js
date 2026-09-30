// Connexion à la base PostgreSQL via Prisma. Ce fichier est importé partout où on parle à la base.
import 'dotenv/config' // lit le fichier .env (DATABASE_URL)
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// L'"adapter" est le pilote qui sait parler à PostgreSQL ; Prisma s'en sert pour envoyer les requêtes.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

// Un SEUL client partagé pour tout le serveur (en créer un par requête épuiserait les connexions).
export const prisma = new PrismaClient({ adapter })
