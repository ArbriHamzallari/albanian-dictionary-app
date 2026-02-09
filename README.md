# Fjalingo 🦅

Mëso shqipen autentike, argëtohu ndërkohë! Kthe fjalët e huazuara në shqipe të pastër.

Fjalingo është platformë e gamifikuar (stil Duolingo) për të gjetur fjalën e saktë shqipe për fjalët e huazuara. Projekti përfshin backend në Node.js/Express, frontend në React/Vite me Tailwind CSS dhe bazë të dhënash PostgreSQL.

## Veçoritë

- Kërkim i shpejtë për fjalë të huazuara dhe zëvendësime shqip
- Fjala e Ditës me sfidë ditore
- Kuiz interaktiv me pikë dhe arritje
- Profil përdoruesi me seria, nivele dhe pikë
- Sistem arritjesh (achievements) i gamifikuar
- Dark mode
- Formë për propozime të reja nga publiku
- Panel administrimi për menaxhim të fjalëve dhe propozimeve
- Dizajn i frymëzuar nga Duolingo: lojëtar, miqësor, argëtues

## Parakushte

- Node.js 18+
- PostgreSQL 14+

## Instalimi

### 1) Konfigurimi i environment-it

Krijoni skedarin `.env` në `backend/` bazuar në `.env.example`:

```
DATABASE_URL=postgresql://postgres:admin@localhost:5432/fjalingo_dictionary
JWT_SECRET=vendosni-nje-secret-te-forte
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Për frontend, krijoni `frontend/.env` sipas `frontend/.env.example`:

```
VITE_API_URL=http://localhost:5000/api
```

### 2) Instalimi i varësive

Backend:
```
cd backend
npm install
```

Frontend:
```
cd frontend
npm install
```

### 3) Migrimet e databazës

```
cd backend
npm run migrate
```

Kjo do ekzekutojë `001_init.sql` (tabela bazë) dhe `002_user_profiles.sql` (profile, seria, arritje).

### 4) Mbushja e të dhënave fillestare (seed)

```
cd backend
npm run seed
```

### 5) Nisja e aplikacionit në zhvillim

Backend:
```
cd backend
npm run dev
```

Frontend:
```
cd frontend
npm run dev
```

## Admin (zhvillim lokal)

Për zhvillim lokal, seed krijon një llogari admin me kredenciale të paracaktuara (shiko `backend/.env.example`). **Në production vendosni vetëm `ADMIN_EMAIL` dhe `ADMIN_PASSWORD` në backend/.env dhe mos përdorni kurrë kredenciale të paracaktuara.** Shiko [DEPLOYMENT.md](DEPLOYMENT.md) për hapat e deploy-it.

## Dokumentimi i API-së

### Endpoints publike

#### `GET /api/words/search?q={query}`
Kërkim i fjalëve sipas fjalës së huazuar ose fjalës shqipe.

#### `GET /api/words/:id`
Kthen të dhënat e plota për një fjalë.

#### `GET /api/words/word-of-the-day`
Kthen fjalën e ditës.

#### `GET /api/words/random`
Kthen një fjalë të rastësishme.

#### `GET /api/words/popular`
Kthen 10 fjalët më të kërkuara.

#### `POST /api/suggestions`
Dërgon një propozim për fjalë të re.

### Endpoints të profilit

#### `POST /api/profile`
Krijon ose merr profilin e përdoruesit (body: `{ userId }`).

#### `GET /api/profile/:userId`
Kthen profilin e përdoruesit me pikë, seria, arritje.

#### `POST /api/profile/:userId/points`
Jep pikë përdoruesit (body: `{ points }`).

#### `GET /api/profile/:userId/streak`
Kthen serinë e përdoruesit.

#### `POST /api/profile/:userId/streak`
Përditëson serinë e përdoruesit.

#### `GET /api/profile/meta/achievements`
Liston të gjitha arritjet e mundshme.

#### `POST /api/profile/meta/achievements/unlock`
Shkyç një arritje (body: `{ userId, achievementId }`).

### Endpoints të mbrojtura (Admin)

> Përdorni header `Authorization: Bearer <token>`

#### `POST /api/auth/login`
Autentifikim i adminit.

#### `GET /api/admin/words`
Liston të gjitha fjalët (admin).

#### `POST /api/admin/words`
Shton fjalë të re (admin).

#### `PUT /api/admin/words/:id`
Përditëson një fjalë (admin).

#### `DELETE /api/admin/words/:id`
Fshin një fjalë (admin).

#### `POST /api/admin/word-of-the-day`
Vendos fjalën e ditës.

#### `GET /api/admin/analytics/top-searches`
Kthen kërkimet më të shpeshta.

## Teknologjitë

- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, Lucide React, Canvas Confetti
- **Backend:** Node.js, Express, PostgreSQL, JWT, Bcrypt
- **Font:** Nunito (Google Fonts)
- **Dizajni:** Stil Duolingo - lojëtar, me ngjyra, i gamifikuar

## Deploy

Hapat e plotë për deploy falas (Netlify + backend + databazë) janë në **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## Social

- Instagram: https://www.instagram.com/codrix.al/
- Website: https://codrixwebsite.vercel.app/
- LinkedIn: https://www.linkedin.com/company/codrix-solutions/

hello@fjalingo.al
