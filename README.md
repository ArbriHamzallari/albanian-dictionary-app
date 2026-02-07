# Shkolla 7 Marsi - Fjalor Shqip

Platformë edukative për Shkollën 7 Marsi në Tiranë që ndihmon nxënësit dhe mësuesit të gjejnë fjalën e saktë shqipe për fjalët e huazuara. Projekti përfshin backend në Node.js/Express, frontend në React/Vite dhe bazë të dhënash PostgreSQL.

## Përshkrimi i Projektit

Fjalori synon të forcojë përdorimin e shqipes së pastër duke ofruar:
- Kërkim të shpejtë për fjalë të huazuara dhe zëvendësime shqip.
- Faqe të detajuara me përkufizime dhe zgjedhime për foljet.
- Fjala e Ditës për mësim të përditshëm.
- Formë për propozime të reja nga publiku.
- Panel administrimi për menaxhim të fjalëve dhe propozimeve.

## Parakushte
- Node.js 18+
- PostgreSQL 14+

## Instalimi

### 1) Konfigurimi i environment-it
Krijoni skedarin `.env` në `backend/` bazuar në `.env.example`:

```
DATABASE_URL=postgresql://postgres:admin@localhost:5432/shkolla_dictionary
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

## Kredencialet e Adminit (fillestare)

- **Email:** `admin@shkolla7marsi.edu.al`
- **Fjalëkalimi:** `Fjalor123!`

Ndryshoni fjalëkalimin pas konfigurimit fillestar.

## Dokumentimi i API-së

### Endpoints publike

#### `GET /api/words/search?q={query}`
Kërkim i fjalëve sipas fjalës së huazuar ose fjalës shqipe.

**Shembull përgjigje:**
```
{
  "results": [
    {
      "id": 1,
      "borrowed_word": "investigoj",
      "correct_albanian": "hetoj",
      "category": "Folje",
      "definitions": [
        {
          "definition_text": "Të bësh hetime...",
          "example_sentence": "Policia po heton rastin"
        }
      ],
      "conjugations": [
        {
          "conjugation_type": "E tashmja",
          "conjugation_text": "hetoj, heton..."
        }
      ]
    }
  ]
}
```

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

**Body:**
```
{
  "borrowed_word": "monitoroj",
  "suggested_albanian": "mbikëqyr",
  "suggested_definition": "Të vëzhgosh ose kontrollosh",
  "submitter_name": "Ardit",
  "submitter_email": "ardit@example.com"
}
```

### Endpoints të mbrojtura (Admin)

> Përdorni header `Authorization: Bearer <token>`

#### `POST /api/auth/login`
Autentifikim i adminit.

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

#### `GET /api/suggestions`
Liston të gjitha propozimet.

#### `PUT /api/suggestions/:id/approve`
Aprovon një propozim.

#### `PUT /api/suggestions/:id/reject`
Refuzon një propozim.

## Udhëzime për Deploy

### Backend (Render/Railway)
- Vendosni variablat e mjedisit sipas `.env`.
- Ekzekutoni `npm run migrate` dhe `npm run seed` pas deploy.

### Frontend (Vercel/Netlify)
- Vendosni variablin `VITE_API_URL` me URL-në e backend-it.
- Ndërtoni projektin me `npm run build`.

## Shënime dhe supozime
- Kërkimi përdor `pg_trgm` për sugjerime më të mira (duhet të jetë aktiv në PostgreSQL).
- Për fjalë të reja, admini duhet të menaxhojë kategoritë dhe zgjedhimet manualisht.
- Nëse mungon fjala e ditës, faqja shfaq mesazh informues.
