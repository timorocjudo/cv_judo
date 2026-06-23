# Tests IpponId

Philosophie : tests ciblés sur la logique métier critique et les règles de sécurité RLS — pas de couverture exhaustive.

## Lancer les tests

```bash
npm run test              # One-shot (unit + integration)
npm run test:watch        # Mode watch pour le développement
npm run test:coverage     # Avec rapport de couverture
```

## Structure

| Dossier | Contenu | Prérequis |
|---------|---------|-----------|
| `unit/` | Fonctions pures — slugify, profileValidation, palmaresStats | Aucun |
| `integration/` | Server Actions critiques — Supabase mocké via vi.mock() | Aucun |
| `security/` | Règles RLS Supabase — base réelle | `supabase start` + `.env.local` |

## Tests de sécurité RLS (dossier `security/`)

Ces tests vérifient que la base Supabase locale bloque bien les accès non autorisés.

**Prérequis :**
1. `supabase start` doit être lancé
2. `.env.local` doit contenir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

```bash
supabase start
npm run test -- __tests__/security/
```

**Règles RLS testées :**
- `published = true` → lisible par tous (anon + authentifiés)
- `published = false` → lisible uniquement par le propriétaire
- Mutations (UPDATE/DELETE/INSERT) → uniquement par le propriétaire, jamais par un autre utilisateur ou anon

## CI GitHub

La CI (`.github/workflows/tests.yml`) lance uniquement les tests unit/ et integration/ à chaque push sur `main` et chaque Pull Request. Les tests de sécurité (qui nécessitent Supabase local) sont exclus de la CI par défaut.
