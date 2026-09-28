"""
Train a 1D CNN on the landmark CSVs in data/, mirroring static_predict.py's data
handling so the result is directly comparable to the MLP/RF/SVM models.

Convolutions run along the 21-landmark axis with (x, y, z) as the 3 input
channels. Landmarks are ordered wrist -> thumb -> index -> ... -> pinky, so a
width-3 kernel sees adjacent joints of the same finger. That structure is what a
plain MLP on the flat 63-vector has to learn from scratch.

torch is a TRAINING-TIME dependency only: weights are exported to a plain .npz
that cnn_predict.py reads with NumPy alone. Run this from the repo root with the
isolated env, which must not be the backend venv:

    .venv-cnn/bin/python train_cnn.py
"""

import os
from glob import glob

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

DATA_GLOB = "data/asl_*.csv"
ENCODER_PATH = "other_models/label_encoder.pkl"
OUT_PATH = "other_models/asl_cnn_model.npz"
SEED = 42
EPOCHS = 200
PATIENCE = 20
BATCH = 64
BN_EPS = 1e-5


class LandmarkCNN(nn.Module):
    def __init__(self, n_classes, pooled_len):
        super().__init__()
        self.conv1, self.bn1 = nn.Conv1d(3, 64, 3, padding=1), nn.BatchNorm1d(64, eps=BN_EPS)
        self.conv2, self.bn2 = nn.Conv1d(64, 128, 3, padding=1), nn.BatchNorm1d(128, eps=BN_EPS)
        self.pool = nn.MaxPool1d(2)
        self.conv3, self.bn3 = nn.Conv1d(128, 128, 3, padding=1), nn.BatchNorm1d(128, eps=BN_EPS)
        self.drop = nn.Dropout(0.3)
        self.fc1 = nn.Linear(128 * pooled_len, 128)
        self.fc2 = nn.Linear(128, n_classes)
        self.relu = nn.ReLU()

    def forward(self, x):
        h = self.relu(self.bn1(self.conv1(x)))
        h = self.relu(self.bn2(self.conv2(h)))
        h = self.pool(h)
        h = self.relu(self.bn3(self.conv3(h)))
        h = self.drop(h.flatten(1))
        h = self.drop(self.relu(self.fc1(h)))
        return self.fc2(h)


def load_data():
    files = sorted(glob(DATA_GLOB))
    if not files:
        raise SystemExit(f"no training data matched {DATA_GLOB}")
    df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)
    # Session files are labelled A, A2, A3, A4 -> collapse to the letter.
    labels = df.iloc[:, -1].astype(str).str[0]
    x = df.iloc[:, :-1].to_numpy(dtype=np.float32)

    if os.path.exists(ENCODER_PATH):
        le = joblib.load(ENCODER_PATH)
        y = le.transform(labels)
    else:
        le = LabelEncoder()
        y = le.fit_transform(labels)
    return x, y.astype(np.int64), le, len(files)


def to_channels(x):
    return torch.from_numpy(x.reshape(-1, 21, 3).transpose(0, 2, 1).copy())


def export(model, feat_mean, feat_std, classes):
    model.eval()
    sd = {k: v.detach().cpu().numpy() for k, v in model.state_dict().items()}
    params = {
        "feat_mean": feat_mean.astype(np.float32),
        "feat_std": feat_std.astype(np.float32),
        "classes": np.asarray(classes, dtype="<U2"),
        "bn_eps": np.float32(BN_EPS),
    }
    for i in (1, 2, 3):
        params[f"conv{i}_w"] = sd[f"conv{i}.weight"]
        params[f"conv{i}_b"] = sd[f"conv{i}.bias"]
        params[f"bn{i}_w"] = sd[f"bn{i}.weight"]
        params[f"bn{i}_b"] = sd[f"bn{i}.bias"]
        params[f"bn{i}_mean"] = sd[f"bn{i}.running_mean"]
        params[f"bn{i}_var"] = sd[f"bn{i}.running_var"]
    for i in (1, 2):
        params[f"fc{i}_w"] = sd[f"fc{i}.weight"]
        params[f"fc{i}_b"] = sd[f"fc{i}.bias"]
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    np.savez(OUT_PATH, **params)


def main():
    torch.manual_seed(SEED)
    np.random.seed(SEED)

    x, y, le, n_files = load_data()
    print(f"loaded {len(x)} samples from {n_files} files, {len(le.classes_)} classes")

    # Same split parameters as static_predict.py so the comparison is like-for-like.
    x_tr, x_va, y_tr, y_va = train_test_split(
        x, y, test_size=0.2, random_state=SEED, stratify=y
    )

    feat_mean = x_tr.mean(axis=0)
    feat_std = x_tr.std(axis=0)
    feat_std[feat_std < 1e-8] = 1.0
    xt_tr = to_channels((x_tr - feat_mean) / feat_std)
    xt_va = to_channels((x_va - feat_mean) / feat_std)
    yt_tr, yt_va = torch.from_numpy(y_tr), torch.from_numpy(y_va)

    model = LandmarkCNN(len(le.classes_), pooled_len=21 // 2)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    lossf = nn.CrossEntropyLoss()

    best_loss, best_state, bad = float("inf"), None, 0
    for epoch in range(1, EPOCHS + 1):
        model.train()
        perm = torch.randperm(len(xt_tr))
        for i in range(0, len(perm), BATCH):
            idx = perm[i:i + BATCH]
            opt.zero_grad()
            loss = lossf(model(xt_tr[idx]), yt_tr[idx])
            loss.backward()
            opt.step()

        model.eval()
        with torch.no_grad():
            logits = model(xt_va)
            val_loss = lossf(logits, yt_va).item()
            val_acc = (logits.argmax(1) == yt_va).float().mean().item()
        if epoch % 10 == 0 or epoch == 1:
            print(f"epoch {epoch:3d}  val_loss {val_loss:.4f}  val_acc {val_acc:.4f}")

        if val_loss < best_loss - 1e-4:
            best_loss, bad = val_loss, 0
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            bad += 1
            if bad >= PATIENCE:
                print(f"early stop at epoch {epoch}")
                break

    model.load_state_dict(best_state)
    export(model, feat_mean, feat_std, le.classes_)

    model.eval()
    with torch.no_grad():
        torch_pred = model(xt_va).argmax(1).numpy()
    print(f"\nheld-out split accuracy: {accuracy_score(y_va, torch_pred):.4f}")
    print(classification_report(y_va, torch_pred, target_names=list(le.classes_),
                                zero_division=0))
    print("NOTE: this split shares capture sessions between train and val, so it is\n"
          "optimistic. results.json (unseen signers) is the meaningful comparison.")

    # The exported NumPy path is what actually gets scored, so verify it agrees.
    from cnn_predict import LandmarkCNNPredictor
    np_pred = LandmarkCNNPredictor.load(OUT_PATH).predict(x_va)
    mismatch = int((np_pred != torch_pred).sum())
    print(f"\nwrote {OUT_PATH}")
    print(f"numpy/torch parity: {len(x_va) - mismatch}/{len(x_va)} agree"
          + ("" if mismatch == 0 else f"  <-- {mismatch} MISMATCH"))


if __name__ == "__main__":
    main()
