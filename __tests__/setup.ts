import { config } from 'dotenv'

// Charge .env.local pour les tests de sécurité (Supabase local)
// Les tests unitaires et d'intégration n'ont pas besoin de ces variables
config({ path: '.env.local' })
