"""
Pure-NumPy inference for the landmark CNN trained by train_cnn.py.

Scoring deliberately avoids torch/tensorflow: those ship native libraries that
conflict with MediaPipe's bundled Abseil/TFLite in this repo (see CLAUDE.md), so
keeping the eval path NumPy-only is what lets score_from_landmarks.py stay
crash-proof. It also means the backend could serve this model without adding a
deep-learning dependency.
"""

import numpy as np

POOL = 2


def _conv1d(x, w, b, padding=1):
    """x: (N, C_in, L) -> (N, C_out, L). Matches torch.nn.Conv1d with stride 1."""
    n, _, length = x.shape
    if padding:
        x = np.pad(x, ((0, 0), (0, 0), (padding, padding)))
    k = w.shape[2]
    out = np.zeros((n, w.shape[0], length), dtype=np.float32)
    for j in range(k):
        out += np.einsum("oi,nil->nol", w[:, :, j], x[:, :, j:j + length], optimize=True)
    return out + b[None, :, None]


def _batchnorm(x, gamma, beta, mean, var, eps):
    scale = gamma / np.sqrt(var + eps)
    return x * scale[None, :, None] + (beta - mean * scale)[None, :, None]


def _maxpool(x):
    # torch.nn.MaxPool1d(2) floors odd lengths, dropping the trailing element.
    length = (x.shape[2] // POOL) * POOL
    return x[:, :, :length].reshape(x.shape[0], x.shape[1], length // POOL, POOL).max(axis=3)


class LandmarkCNNPredictor:
    """Exposes the sklearn-style .predict(X) contract used by the eval pipeline."""

    def __init__(self, params):
        self.p = {k: params[k] for k in params.files}
        self.classes_ = self.p["classes"]

    @classmethod
    def load(cls, path):
        return cls(np.load(path, allow_pickle=False))

    def _logits(self, x):
        p = self.p
        x = np.asarray(x, dtype=np.float32)
        x = (x - p["feat_mean"]) / p["feat_std"]
        # (N, 63) is landmark-major (x0,y0,z0,x1,...) -> (N, 3 axes, 21 landmarks)
        h = x.reshape(-1, 21, 3).transpose(0, 2, 1)

        for i in (1, 2):
            h = _conv1d(h, p[f"conv{i}_w"], p[f"conv{i}_b"])
            h = _batchnorm(h, p[f"bn{i}_w"], p[f"bn{i}_b"], p[f"bn{i}_mean"],
                           p[f"bn{i}_var"], float(p["bn_eps"]))
            h = np.maximum(h, 0.0)
        h = _maxpool(h)
        h = _conv1d(h, p["conv3_w"], p["conv3_b"])
        h = _batchnorm(h, p["bn3_w"], p["bn3_b"], p["bn3_mean"], p["bn3_var"],
                       float(p["bn_eps"]))
        h = np.maximum(h, 0.0)

        h = h.reshape(h.shape[0], -1)
        h = np.maximum(h @ p["fc1_w"].T + p["fc1_b"], 0.0)
        return h @ p["fc2_w"].T + p["fc2_b"]

    def predict(self, x):
        return self._logits(x).argmax(axis=1)

    def predict_proba(self, x):
        z = self._logits(x)
        z -= z.max(axis=1, keepdims=True)
        e = np.exp(z)
        return e / e.sum(axis=1, keepdims=True)
