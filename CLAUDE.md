# ASL Hangman — project context for Claude

## Purpose

ASL Hangman is a language learning platform designed for young students learning
American Sign Language (ASL). The platform aims to gamify the learning process to
ease students into learning new concepts and to build their interest.

**Why this exists:** ASL, like any other language, can be difficult to learn,
especially for young students without adequate support. Unlike spoken languages,
there aren't many "fun" learning methods for ASL — this application seeks to close
that gap. It also aims to bring awareness to more accessible applications and
technology generally.

Concretely: a Next.js frontend shows a target letter/word, the player signs it to
their webcam, a FastAPI backend runs MediaPipe hand-landmark extraction + a
scikit-learn MLP classifier to recognize the letter, and points/leaderboard state
are tracked via SQLAlchemy (Postgres in prod, SQLite fallback locally). See
`README.md` for full architecture, endpoints, and run instructions — that doc is
accurate and up to date; this file is for things the README doesn't cover.

## Bugs found and fixed (2026-09-27)

### 1. FIXED — backend crashed on startup (native ABI conflict), not a code bug
Running `uvicorn main:app` (with or without `--reload`, even a bare `python -c
"import main"`) used to crash with:
```
libc++abi: terminating due to uncaught exception of type std::__1::system_error: mutex lock failed: Invalid argument
```
or hang/deadlock with `[mutex.cc : 452] RAW: Lock blocking ...`.

**Root cause:** `backend/requirements.txt` was far more bloated than a FastAPI
inference service needs — it included `tensorflow==2.21.0`, `jax`/`jaxlib`,
`streamlit`, `streamlit-webrtc`, `gradio`, `sentencepiece`, `aiortc`, etc. on top
of `mediapipe==0.10.15` (mediapipe bundles its *own* TFLite/Abseil runtime).
Having a second, separately-versioned `tensorflow`/`grpcio`/`protobuf` stack
loaded in the same process as mediapipe's bundled one caused two incompatible
builds of Abseil's `Mutex` to coexist — Abseil isn't ABI-stable across builds,
so this corrupted mutex state and crashed/deadlocked, typically right when
`mediapipe.solutions.hands.Hands(...)` initialized.

This was never caught by CI (`.github/workflows/ci.yml`) because the test suite
stubs `mediapipe` via `sys.modules` entirely, so the real native library was
never loaded there — `backend/tests/conftest.py` even has a comment noting
mediapipe "has a protobuf incompatibility in some local envs."

**Fix applied:** rebuilt `backend/.venv` from scratch with only the packages
`main.py` actually imports (fastapi, uvicorn, pydantic, sqlalchemy,
psycopg2-binary, python-dotenv, pillow, numpy, joblib, mediapipe==0.10.15,
scikit-learn==1.6.1 — the scikit-learn pin matches the version `asl_model.pkl`
was trained with, avoiding pickle version-mismatch warnings), then re-froze
`backend/requirements.txt` from that clean environment (119 lines → 55, no more
tensorflow/jax/streamlit/gradio/grpcio). Verified: `import main` succeeds, the
server boots and serves `/` and `/leaderboard/`, and the full pytest suite
(20 tests) passes. **Do not reuse the repo-root `.venv`** for the backend — it
still has the conflicting ML stack installed and will reproduce this crash.

### 2. FIXED — `/predict/` swallowed all exceptions into a generic 200 response
`backend/main.py` used to catch every exception in `predict()` and return
`{"error": "parsing body error"}` with **HTTP 200**, regardless of the real
cause. Now: an unparseable image upload raises `HTTPException(400, "Uploaded
file is not a valid image")`, and an unexpected failure during feature
extraction/inference raises `HTTPException(500, "Prediction failed")`. "No hand
detected" is still a 200 `{"error": ...}` since that's a legitimate model
outcome, not a failure. `backend/tests/test_predict.py` updated to match.
Also fixed `frontend/asl-web/app/api/proxy/predict/route.ts`, which was
hardcoding `NextResponse.json(json)` (always 200) for JSON responses regardless
of the backend's actual status — it now forwards `res.status`, otherwise the
400/500 fix above would have been silently flattened back to 200 at the proxy.

### 3. FIXED — stale plaintext RDS credentials in `backend/.env`
Replaced the real (dead) RDS host/password with placeholder values
(`<postgres-host>` etc.) per user's choice — the DB is confirmed torn down
(README already noted this), so local runs always use the SQLite fallback
anyway. File remains gitignored.

### 4. FIXED — stray large/duplicate files removed from git
Removed and untracked (per user's choice — the eval scripts/logs/landmark CSVs
at the root were left alone as likely in-progress work):
- `AWSCLIV2.pkg` (39 MB AWS CLI installer, didn't belong in version control)
- `test-landmarks2.csv` (byte-identical duplicate of `test-landmarks.csv`)

### 5. FIXED — generated build artifacts were tracked in git
`backend/__pycache__/`, `backend/tests/__pycache__/`, `backend/.coverage`, and
the local dev `backend/asl_hangman.db` were all committed to the repo. Untracked
them (`git rm --cached`, kept locally) and added `__pycache__/`, `*.pyc`,
`.pytest_cache/`, `.coverage`, `backend/asl_hangman.db` to `.gitignore` so they
stop reappearing in `git status`/commits.

## Not fixed / left as-is
- Root-level untracked experiment files (`eval_progress.log`, `eval_stdout.log`,
  `evaluate_models.py`, `extract_landmarks.py`, `landmarks_Test_Alphabet.csv`,
  `landmarks_test-set.csv`, `results.json`, `score_from_landmarks.py`) — left
  untouched at the user's request since they look like in-progress work.

## Setup notes for future sessions

- **Do not use the repo-root `.venv`** for the backend — it's a general-purpose
  ML environment (jax, streamlit, gradio, tensorflow, etc.) and will reproduce
  the crash described in issue #1 above. Use `backend/.venv`, built from the
  now-trimmed `backend/requirements.txt`.
- Backend must be run from the `backend/` directory (relative paths to
  `asl_model.pkl` / `label_encoder.pkl`).
- Frontend expects `frontend/asl-web/.env.local` with `BACKEND_URL=http://localhost:8000`.
- Backend tests (`backend/tests/`, run via `pytest --cov=main`) stub out
  MediaPipe/models/DB entirely — passing tests do **not** guarantee the real
  server boots. Always verify with an actual `uvicorn` run (or at least
  `python -c "import main"`) after backend changes.
- `backend/requirements.txt` was regenerated via `pip freeze` from a clean venv
  on 2026-09-27 (Python 3.10.11, macOS/arm64). If it needs updating again,
  rebuild the same way rather than hand-adding packages, to avoid reintroducing
  ABI conflicts.
