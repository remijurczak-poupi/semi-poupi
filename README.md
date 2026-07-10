# Semi-Poupi 2026 — site web

Site statique (HTML/CSS/JS, aucun outil de build nécessaire) pour la 5ème édition
du Semi-Poupi, avec l'équipe qui relève le **Défi24h** à Angers au profit du Téléthon.

## Contenu

- `index.html` — page d'accueil (infos événement, Défi24h, Téléthon)
- `inscription.html` — formulaire RSVP (présence, taille de t-shirt, horaires)
- `vote.html` — vote pour le nom de l'équipe
- `admin.html` — tableau de bord (réservé à l'organisation, mot de passe léger)
- `sql/schema.sql` — script SQL à exécuter une fois dans Supabase
- `js/supabase-config.js` — à compléter avec l'URL + la clé publique Supabase
- `js/admin-config.js` — mot de passe de la page admin (à changer)
- `assets/logo.png` — logo (actuellement un placeholder, à remplacer par le vrai logo)

## Mise en route

### 1. Créer la base de données (Supabase, gratuit)

1. Va sur [supabase.com](https://supabase.com), crée un compte et un nouveau projet.
2. Une fois le projet créé, ouvre **SQL Editor**, colle le contenu de `sql/schema.sql`, et clique **Run**.
   Ça crée les 3 tables (`participants`, `team_name_options`, `team_name_votes`) avec les bonnes permissions.
3. Va dans **Project Settings > API**. Récupère :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public key** (une longue chaîne de caractères)
4. Ouvre `js/supabase-config.js` et remplace les deux valeurs `SUPABASE_URL` et `SUPABASE_ANON_KEY`.

⚠️ **Important sur la confidentialité** : pour rester 100% statique (sans serveur),
le site lit/écrit directement dans Supabase avec la clé publique. Les données
(prénoms, tailles de t-shirt, horaires, votes) sont donc techniquement lisibles
par quelqu'un de suffisamment curieux qui inspecterait le code du site. Ce n'est
pas une donnée sensible, mais ne mets jamais d'info confidentielle (mot de passe,
coordonnées bancaires, adresse...) dans les formulaires.

### 2. Changer le mot de passe admin

Ouvre `js/admin-config.js` et change la valeur de `ADMIN_PASSWORD`.

### 3. Remplacer le logo

Remplace le fichier `assets/logo.png` par le vrai logo Semi-Poupi (même nom de fichier,
idéalement carré, fond transparent).

### 4. Tester en local

Depuis le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvre `http://localhost:8000` dans ton navigateur.

### 5. Mettre en ligne (GitHub Pages)

1. Crée un dépôt GitHub (public ou privé), pousse tous ces fichiers dedans.
2. Dans **Settings > Pages**, choisis la branche `main` et le dossier `/ (root)`.
3. Le site sera disponible à une adresse du type `https://ton-compte.github.io/nom-du-repo/`.

## Modifier le contenu

Tout le texte est directement dans les fichiers `.html` — aucune compilation nécessaire,
un simple `git push` (ou re-upload) suffit pour mettre à jour le site en ligne.
