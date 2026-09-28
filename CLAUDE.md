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
Removed the real (dead) RDS host/password per user's choice — the DB is
confirmed torn down (README already noted this), so local runs always use the
SQLite fallback anyway. The vars are left **commented out** rather than set to
placeholder strings, because a non-empty placeholder still triggers a real
(failing) DNS lookup on every boot. File remains gitignored.

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

## Model comparison / CNN pipeline (added 2026-09-27)

A 4th model — a 1D CNN over the landmark tensor — was added alongside MLP/RF/SVM.

**Files:** `train_cnn.py` (training, torch), `cnn_predict.py` (pure-NumPy
inference), output `other_models/asl_cnn_model.npz`. Run training with the
isolated env: `.venv-cnn/bin/python train_cnn.py`.

**Why a 1D CNN and not an image CNN:** there are no training *images* in the
repo — `capture_data.py` only ever saved landmarks, so `data/` is 104 CSVs
(4 sessions × 100 frames × 26 letters = 10,400 rows). An image CNN would have to
train on `test-set/`/`Test_Alphabet/`, which are the evaluation sets (leakage).
The 1D CNN convolves along the 21-landmark axis with (x,y,z) as channels, so
width-3 kernels see adjacent joints of the same finger — and it consumes the
identical 63 features as the other three models, which is what makes the
comparison apples-to-apples.

**Why torch is training-only:** `tensorflow` in the root venv is *broken*
(`protobuf 4.25.7` lacks `runtime_version`, which TF 2.21 needs) and cannot be
fixed there, because mediapipe pins `protobuf<5`. So TF and mediapipe can never
coexist in one env. To avoid importing that class of problem into the eval path,
`train_cnn.py` exports plain weights to `.npz` and `cnn_predict.py` implements
the forward pass (conv1d / batchnorm / maxpool / dense) in NumPy alone. This
keeps `score_from_landmarks.py` dependency-light by design, and means the
backend could serve the CNN without a DL dependency. `train_cnn.py` asserts
NumPy/torch prediction parity on the val split after every run (last run:
2080/2080 exact).

**Results on unseen signers** (`results.json`, accuracy on detected / macro-F1):

| model | test-set (n=780) | Test_Alphabet (n=2600) |
| --- | --- | --- |
| MLP *(currently served)* | 23.1% / 0.135 | 38.3% / 0.384 |
| RF | **30.9%** / 0.248 | 45.5% / 0.452 |
| SVM | 26.1% / 0.173 | 49.6% / 0.496 |
| CNN | 30.2% / 0.230 | **50.3%** / 0.497 |

**The important takeaway:** the CNN scores **99.9%** on the internal
train_test_split but **30–50%** on unseen signers. Every model shows this same
collapse, so **the bottleneck is the data, not the architecture** — swapping in
a CNN bought only +0.7pp over SVM. Two root causes to fix before trying more
models:
1. The internal split is leaky — the 4 capture sessions per letter are ~100
   near-consecutive webcam frames each, so random splitting puts near-duplicate
   frames on both sides. Split by *session* for an honest number.
2. Training data is one person/camera/distance, and features are wrist-relative
   but never *scale*-normalized (MediaPipe x/y are image-normalized, so camera
   distance rescales every feature). Also note `capture_data.py` flips the frame
   and applies no handedness normalization while `main.py` negates x for left
   hands — verify those conventions agree.

Also: whatever gets served, it should not stay MLP — it is the worst of the four
on both datasets.

**Local testing scripts now cover all four models.** Both `testing.py` (batch,
scores `test-landmarks.csv`) and `localpredict.py` (live webcam, model name as
argv[1], default CNN) were **already broken** before this change — they loaded
`asl_model.pkl` from the repo root, where no `.pkl` exists, and `testing.py` read
the duplicate `test-landmarks2.csv` that got deleted. Both now load from
`other_models/` and handle the CNN's `.npz`.

Run `localpredict.py` with **`backend/.venv`** — it has cv2 + a working MediaPipe
0.10.15 and no tensorflow. The root venv's MediaPipe aborts intermittently
(`extract_landmarks.py`'s own docstring calls this out, and it hung during
verification here). Because CNN inference is NumPy-only it coexists with
MediaPipe in one process; importing torch/TF there would crash it.

`localpredict.py` also has `MIRROR_LEFT_HAND = False`, matching how
`capture_data.py` recorded training data. `backend/main.py` *does* mirror left
hands, so this flag is the lever for testing that suspected train/serve mismatch
against a live camera.

## Not fixed / left as-is
- Root-level untracked experiment files (`eval_progress.log`, `eval_stdout.log`,
  `evaluate_models.py`, `extract_landmarks.py`, `landmarks_Test_Alphabet.csv`,
  `landmarks_test-set.csv`, `results.json`, `score_from_landmarks.py`) — left
  untouched at the user's request since they look like in-progress work.

## ⚠️ The #1 gotcha: two venvs, both named `.venv`

There are **two** virtualenvs in this repo and activating the wrong one is what
makes the backend crash:

| venv | Contents | Backend runs? |
| --- | --- | --- |
| `./.venv` (repo root) | general ML env — **tensorflow 2.21, jax, streamlit, gradio**, mediapipe 0.10.21 | ❌ crashes (`mutex lock failed`) |
| `./backend/.venv` | only what `main.py` needs, mediapipe 0.10.15, **no tensorflow** | ✅ works |

Because both were named `.venv`, the shell prompt read `(.venv)` either way and
gave no clue which was active — this exact confusion caused a "the fix didn't
work" report after issue #1 was already fixed. The backend venv's prompt has
since been changed to read **`(asl-backend)`** (edited `VIRTUAL_ENV_PROMPT` /
`PS1` in `backend/.venv/bin/activate`) so the two are now visually distinct.

To run the backend, always:
```bash
cd backend
source .venv/bin/activate     # prompt must read (asl-backend)
which python                  # must be .../backend/.venv/bin/python
uvicorn main:app --reload
```
If you see `libc++abi: ... mutex lock failed: Invalid argument`, you are in the
wrong venv — check `which python` before debugging anything else. Note the root
scripts (`evaluate_models.py`, `extract_landmarks.py`, …) import only cv2,
mediapipe, numpy, pandas, sklearn, joblib and tqdm — nothing needs tensorflow,
so the tensorflow install in the root venv is dead weight as well as a landmine.

## Setup notes for future sessions

- **Do not use the repo-root `.venv`** for the backend — see the table above.
  Use `backend/.venv`, built from the now-trimmed `backend/requirements.txt`.
- `backend/.env` intentionally has all three DB vars **commented out** so
  `_make_engine()` takes the clean "env vars not set — using SQLite" branch.
  Don't fill them with placeholder strings: any non-empty value makes the app
  attempt a real DNS lookup/connection on every boot, which fails slowly and
  logs an alarming `PostgreSQL unavailable` traceback.
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
