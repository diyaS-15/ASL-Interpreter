# ASL Hangman

[![CI](https://github.com/diyaS-15/ASL-Interpreter/actions/workflows/ci.yml/badge.svg)](https://github.com/diyaS-15/ASL-Interpreter/actions/workflows/ci.yml)

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
| ML / CV  | MediaPipe Hands, scikit-learn (MLP, RandomForest, SVM), 1D CNN (PyTorch, NumPy inference), NumPy, Pandas, Pillow |
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

From the `backend/` directory (so it can find `asl_model.pkl` and `label_encoder.pkl`),
with `backend/.venv` activated:

```bash
cd backend
source .venv/bin/activate     # prompt should read (asl-backend)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> **Important:** use `backend/.venv`, not the repo-root `.venv`. The root venv is a
> general-purpose ML environment that also has `tensorflow` installed; because
> MediaPipe bundles its own TFLite/Abseil runtime, loading both in one process
> crashes the server at startup with
> `libc++abi: ... mutex lock failed: Invalid argument`. If you hit that error, run
> `which python` — you're in the wrong venv.

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

### Running the tests

Backend has a pytest suite under `backend/tests/`. MediaPipe, the trained models, the database, and `load_dotenv` are all stubbed at import time, so the suite needs no webcam, no model files, and never touches the real Postgres/RDS or the dev SQLite file.

```bash
cd backend
pip install -r requirements-dev.txt
pytest --cov=main --cov-report=term-missing
```

`backend/pyproject.toml` sets `testpaths` and `pythonpath` so `pytest` works from `backend/` regardless of how it's invoked. Current coverage on `main.py`: **94%** (the only uncovered lines are the live PostgreSQL connection path in `_make_engine`, which is intentionally bypassed in tests).

> Note: `/predict/` returns HTTP 400 (`{"detail": "Uploaded file is not a valid image"}`) for malformed uploads and HTTP 500 (`{"detail": "Prediction failed"}`) if inference itself fails. A successful request with no hand in frame is still HTTP 200 with `{"error": "No hand detected"}`, since that's a valid model outcome rather than a failure.

### Rebuild the model (optional)

```bash
python capture_data.py        # collect 100 webcam samples for one letter → data/asl_<LETTER>.csv
python static_predict.py      # train MLP, RandomForest, SVM on data/asl_*.csv and dump .pkl files
```

`static_predict.py` writes `asl_model.pkl`, `asl_rf_model.pkl`, `asl_svm_model.pkl`, and `label_encoder.pkl` to the current directory. Move the MLP model and encoder into `backend/` to serve them.

A fourth model, a 1D CNN over the 21-landmark tensor (x/y/z as channels), trains separately:

```bash
.venv-cnn/bin/python train_cnn.py   # -> other_models/asl_cnn_model.npz
```

It needs torch, so it uses its own isolated venv — torch/tensorflow must not be installed
next to MediaPipe (see the warning above). Weights export to a plain `.npz` and
`cnn_predict.py` runs the forward pass in NumPy alone, so scoring and serving need no
deep-learning dependency.

### Comparing models

```bash
python extract_landmarks.py      # step 1: images -> landmarks_<dataset>.csv (uses MediaPipe)
python score_from_landmarks.py   # step 2: score all models -> results.json (no MediaPipe)
```

Current accuracy on detected hands (unseen signers):

| model | test-set (n=780) | Test_Alphabet (n=2600) |
| --- | --- | --- |
| MLP *(currently served)* | 23.1% | 38.3% |
| RF | **30.9%** | 45.5% |
| SVM | 26.1% | 49.6% |
| CNN | 30.2% | **50.3%** |

All four score >99% on an internal random split but 30–50% on unseen signers, so the
limiting factor is the training data (one signer, no scale normalization, and a leaky
random split across near-duplicate webcam frames), not the model architecture.

### Local testing

Both scripts load every model (MLP/RF/SVM/CNN) from `other_models/`:

```bash
python testing.py                      # batch: score all models on test-landmarks.csv
backend/.venv/bin/python localpredict.py       # live webcam, CNN by default
backend/.venv/bin/python localpredict.py SVM   # pick another model
```

`localpredict.py` needs cv2 + MediaPipe and shows a per-frame confidence, reporting
"unsure" below `MIN_CONFIDENCE`. Use `backend/.venv` for it — it has a working
MediaPipe 0.10.15 plus cv2 and no tensorflow, whereas the root venv's MediaPipe
aborts intermittently. Note `MIRROR_LEFT_HAND` defaults to `False` to match how
`capture_data.py` recorded the training data; `backend/main.py` currently *does*
mirror left hands, so that flag is the switch for A/B-ing the mismatch.

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
├── train_cnn.py             # trains the 1D landmark CNN (torch) -> .npz weights
├── cnn_predict.py           # pure-NumPy CNN inference (sklearn-style .predict)
├── extract_landmarks.py     # eval step 1: images -> landmark CSVs
├── score_from_landmarks.py  # eval step 2: score all 4 models -> results.json
├── localpredict.py          # local prediction helper
├── image-landmarks.py       # static image landmark extractor
├── game.py                  # standalone game prototype
├── Dockerfile               # backend container image
└── .elasticbeanstalk/       # AWS EB application config
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request with three parallel jobs: **backend-tests** (Python 3.10, `pytest --cov=main`), **frontend-build** (Node 20, `npm ci` → `npm run lint` → `npm run build`), and **docker-build** (validates the backend `Dockerfile` builds; no push). The workflow has a commented stub where an Elastic Beanstalk deploy job will attach later — gated on `push` to `main` and `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in repo secrets. It's disabled right now because the RDS instance and EB environment are torn down.

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
