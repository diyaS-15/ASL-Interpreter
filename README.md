# ASL Hangman

A gamified full-stack web app for learning and practicing the American Sign Language alphabet.

## Overview

ASL Hangman pairs a Next.js frontend with a FastAPI inference service that classifies hand-sign images using MediaPipe landmark extraction and a scikit-learn MLP model. Players choose a category (fruits, veggies, animals) and a mode:

- **Learn** — view a target letter, sign it to the camera, and earn points for correct signs.
- **Play** — hangman-style word guessing where each guess is a signed letter.

A global leaderboard tracks points across players.

## Tech stack

| Layer    | Technology                                                                         |
| -------- | ---------------------------------------------------------------------------------- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, axios, lucide-react |
| Backend  | FastAPI, Uvicorn, Pydantic, SQLAlchemy                                             |
| ML / CV  | MediaPipe Hands, scikit-learn (MLP, RandomForest, SVM), NumPy, Pandas, Pillow      |
| Database | PostgreSQL (production) with SQLite fallback (local)                               |
| Deploy   | Docker, AWS Elastic Beanstalk (backend), AWS RDS (Postgres)                        |

## Features

- `/predict/` endpoint: accepts an uploaded image, extracts 21 hand landmarks via MediaPipe, normalizes them relative to the wrist, mirrors left-hand inputs, and returns the predicted letter.
- Player registration (`POST /players/`) and idempotent login by username.
- Leaderboard read (`GET /leaderboard/`) and reset (`DELETE /leaderboard/`).
- Point awards: `+5` for game mode (`/players/{username}/add-points/`), `+2` for learn mode (`/players/{username}/add-learn-points/`).
- Frontend proxy routes under `app/api/proxy/*` forward to the FastAPI backend so the browser never calls it directly.
- Data-collection script (`capture_data.py`) and training script (`static_predict.py`) for rebuilding the model from webcam samples.

## Prerequisites

- Python 3.10 (matches the Dockerfile base image)
- Node.js 18+ (Next.js 15 requirement)
- A webcam (for `capture_data.py` and in-browser sign capture)
- Optional: PostgreSQL instance for shared leaderboard; otherwise SQLite is used automatically

## Installation

Clone, then set up backend and frontend independently.

### Backend

```bash
cd backend
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend/asl-web
npm install
```

## Configuration

### `backend/.env`

The backend uses PostgreSQL when all three vars are set; otherwise it falls back to a local SQLite file (`asl_hangman.db`). See `backend/main.py:25-43`.

```env
HOST=<postgres-host>
NAME=<database-name>
PASS=<postgres-password>
```

The DB user is hard-coded to `postgres` and the port to `5432` in `backend/main.py`.

### `frontend/asl-web/.env.local`

```env
BACKEND_URL=http://localhost:8000
```

Consumed by the Next.js proxy routes in `app/api/proxy/*/route.ts`.

## Usage

### Run the backend

From the `backend/` directory (so it can find `asl_model.pkl` and `label_encoder.pkl`):

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Run the frontend

```bash
cd frontend/asl-web
npm run dev
```

Open http://localhost:3000.

Other frontend scripts (from `frontend/asl-web/package.json`):

```bash
npm run build   # next build
npm start       # next start
npm run lint    # next lint
```

### Rebuild the model (optional)

```bash
python capture_data.py        # collect 100 webcam samples for one letter → data/asl_<LETTER>.csv
python static_predict.py      # train MLP, RandomForest, SVM on data/asl_*.csv and dump .pkl files
```

`static_predict.py` writes `asl_model.pkl`, `asl_rf_model.pkl`, `asl_svm_model.pkl`, and `label_encoder.pkl` to the current directory. Move the MLP model and encoder into `backend/` to serve them.

## Project structure

```
.
├── backend/                 # FastAPI inference + leaderboard service
│   ├── main.py              # API, DB models, MediaPipe + sklearn pipeline
│   ├── asl_model.pkl        # trained MLP classifier
│   ├── label_encoder.pkl    # sklearn LabelEncoder
│   ├── requirements.txt
│   └── .env                 # PostgreSQL credentials (gitignored)
├── frontend/asl-web/        # Next.js 15 App Router app
│   └── app/
│       ├── page.tsx         # home (username, mode, category, leaderboard)
│       ├── Rules/           # rules screen
│       ├── Learn/           # learn mode
│       ├── Game/            # play mode
│       └── api/proxy/       # server-side proxy to FastAPI backend
├── data/                    # asl_<LETTER>.csv landmark training data
├── other_models/            # alternate trained classifiers (RF, SVM)
├── capture_data.py          # webcam → landmark CSV collector
├── static_predict.py        # trains MLP/RF/SVM on landmark CSVs
├── localpredict.py          # local prediction helper
├── image-landmarks.py       # static image landmark extractor
├── game.py                  # standalone game prototype
├── Dockerfile               # backend container image
└── .elasticbeanstalk/       # AWS EB application config
```

## Deployment

### Backend — Docker / Elastic Beanstalk

`Dockerfile` builds the FastAPI service on `python:3.10.11-bullseye` with the OS libraries MediaPipe and Pillow need, installs `backend/requirements.txt`, and serves on port 8000:

```bash
docker build -t asl-hangman-api .
docker run -p 8000:8000 --env-file backend/.env asl-hangman-api
```

`.elasticbeanstalk/config.yml` targets the EB application `asl-hangman-api` (environment `asl-hangman-env`, platform `Docker`). `.ebignore` excludes `frontend/`, `data/`, `other_models/`, and other non-runtime assets from deployments.

### Frontend

https://asl-hangman.vercel.app/
