# EduShield AI

Explainable AI decision support for identifying students at risk of failing/dropping out, explaining
each prediction with SHAP, and managing the resulting interventions.

| Part | Folder | Stack | Port |
|---|---|---|---|
| Frontend | `src/` | React 19, TypeScript, Vite, Tailwind, TanStack Query, Recharts | 5173 |
| Backend API | `backend/` | Node.js, Express, TypeScript, PostgreSQL (`pg`), JWT | 8000 |
| ML service | `ml-service/` | Python, Flask, scikit-learn Random Forest, SHAP | 8001 |
| Shared contract | `contracts/` | `types.ts` (data shapes) + `endpoints.md` (every API route) | — |

Current model: `random_forest-v2.0.0` — 90.9% accuracy, F1 0.816, recall 91.3%, AUC 0.971 on a
held-out, student-grouped test split (see `ml-service/README.md`).

## Run (Windows PowerShell)

Prerequisites: Node.js 20+, Python 3.12+, PostgreSQL 15+ running locally.

```powershell
# 1. ML service
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m app.main            # http://127.0.0.1:8001

# 2. Backend (new terminal)
cd backend
npm install
copy .env.example .env        # then set DATABASE_URL and JWT_SECRET
npm run migrate
npm run seed                  # needs the ML service running
npm run dev                   # http://localhost:8000

# 3. Frontend (new terminal, project root)
npm install
npm run dev                   # http://localhost:5173
```

After seeding, sign in as an admin and use **Settings → Re-score all students** to score every
student with the current model (the seed only scores the first 15).

## Checks

```powershell
npm run typecheck; npm run lint; npm run build          # frontend
cd backend; npm run typecheck; npm test                 # backend unit tests
cd ml-service; venv\Scripts\python -m unittest discover -s tests -v   # ML service tests
```

## Demo accounts (after seeding)

`admin@edushield.ai`, `advisor@edushield.ai` and `student@edushield.ai`, all with the password in
`backend/scripts/seed.ts` (`DEMO_PASSWORD`). Change them before any real use.

## Documentation

- `contracts/endpoints.md` — the full API.
- `ml-service/README.md` and `ml-service/notebooks/dropout_model.ipynb` — data, label, training and evaluation.
