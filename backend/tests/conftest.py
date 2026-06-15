"""
Shared test fixtures.

backend/main.py runs three side effects at import time:
  1. joblib.load("asl_model.pkl") and joblib.load("label_encoder.pkl")
  2. mediapipe.solutions.hands.Hands(...) instantiation
  3. SQLAlchemy engine + Base.metadata.create_all (would touch ./asl_hangman.db
     via the SQLite fallback)

We stub all three BEFORE importing `main` so:
  - real model files and MediaPipe are never required (and never loaded),
  - the engine is redirected to an in-memory SQLite — we never touch the dev
    asl_hangman.db file.

`mediapipe` is faked entirely via sys.modules so the real package is never
imported (it has a protobuf incompatibility in some local envs).
"""
import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

# Force the SQLite-fallback branch in main._make_engine().
for _var in ("HOST", "NAME", "PASS"):
    os.environ.pop(_var, None)

# --- mocks that live for the whole test session ----------------------------

_MOCK_MODEL = MagicMock(name="asl_model")
_MOCK_ENCODER = MagicMock(name="label_encoder")
_MOCK_HANDS = MagicMock(name="mediapipe_hands_instance")


def _fake_joblib_load(path, *args, **kwargs):
    # Inspect filename so the order of joblib.load() calls in main.py doesn't matter.
    p = str(path)
    if "asl_model" in p:
        return _MOCK_MODEL
    if "label_encoder" in p:
        return _MOCK_ENCODER
    raise AssertionError(f"unexpected joblib.load path in tests: {p!r}")


# Fake the mediapipe module so main's `import mediapipe as mp` never hits the
# real package. main.py uses mp.solutions.hands.Hands(...) and
# mp.solutions.drawing_utils.
_fake_mp = MagicMock(name="mediapipe")
_fake_mp.solutions.hands.Hands.return_value = _MOCK_HANDS
sys.modules["mediapipe"] = _fake_mp

# Redirect the SQLite fallback to in-memory. StaticPool + check_same_thread=False
# keeps the single shared in-memory DB alive across TestClient worker threads.
import sqlalchemy  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

_real_create_engine = sqlalchemy.create_engine


def _fake_create_engine(url, *args, **kwargs):
    if str(url).startswith("sqlite"):
        return _real_create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    return _real_create_engine(url, *args, **kwargs)


# Neutralize main's load_dotenv() so backend/.env can't re-populate the
# HOST/NAME/PASS vars we just cleared — otherwise _make_engine() would try to
# reach the real RDS instance during test collection.
patch("dotenv.load_dotenv", lambda *args, **kwargs: False).start()
patch("joblib.load", side_effect=_fake_joblib_load).start()
patch("sqlalchemy.create_engine", side_effect=_fake_create_engine).start()

import main  # noqa: E402

import io  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_state():
    """Fresh DB + reset mocks for each test."""
    main.Base.metadata.drop_all(bind=main.engine)
    main.Base.metadata.create_all(bind=main.engine)
    _MOCK_MODEL.reset_mock(return_value=True, side_effect=True)
    _MOCK_ENCODER.reset_mock(return_value=True, side_effect=True)
    _MOCK_HANDS.reset_mock(return_value=True, side_effect=True)
    yield


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def hands_process():
    """The mocked mediapipe Hands().process — set .return_value per test."""
    return _MOCK_HANDS.process


@pytest.fixture
def model_mock():
    return _MOCK_MODEL


@pytest.fixture
def encoder_mock():
    return _MOCK_ENCODER


@pytest.fixture
def make_hand():
    """Build a fake mediapipe hand object with a .landmark list of (x,y,z) namespaces."""
    def _make(coords):
        landmarks = [SimpleNamespace(x=x, y=y, z=z) for x, y, z in coords]
        return SimpleNamespace(landmark=landmarks)
    return _make


@pytest.fixture
def make_handedness():
    def _make(label):
        return SimpleNamespace(classification=[SimpleNamespace(label=label)])
    return _make


@pytest.fixture
def make_result():
    def _make(hands_list, handednesses_list):
        return SimpleNamespace(
            multi_hand_landmarks=hands_list,
            multi_handedness=handednesses_list,
        )
    return _make


@pytest.fixture
def pil_image():
    return Image.new("RGB", (10, 10))


@pytest.fixture
def jpeg_bytes():
    """Returns a callable that builds a fresh in-memory JPEG BytesIO."""
    def _make(size=(10, 10)):
        img = Image.new("RGB", size)
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        return buf
    return _make
