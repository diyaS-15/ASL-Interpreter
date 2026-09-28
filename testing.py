"""
Local batch test: score every trained model against test-landmarks.csv.

Loads from other_models/ (where the trained artifacts live) and needs no
MediaPipe, so it runs anywhere pandas + sklearn + numpy are installed. The CNN
comes from a .npz read by cnn_predict, not a pickle, so no deep-learning
dependency is required either.
"""

import os

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report

from cnn_predict import LandmarkCNNPredictor

MODEL_DIR = "other_models"
LANDMARKS_CSV = "test-landmarks.csv"
MODELS = {
    "MLP": "asl_model.pkl",
    "RF": "asl_rf_model.pkl",
    "SVM": "asl_svm_model.pkl",
    "CNN": "asl_cnn_model.npz",
}


def load_model(path):
    if path.endswith(".npz"):
        return LandmarkCNNPredictor.load(path)
    return joblib.load(path)


df = pd.read_csv(LANDMARKS_CSV)
labels = df["label"].values
X = df.drop(columns=["label"]).values

le = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
y = le.transform(labels)

summary = {}
for name, fname in MODELS.items():
    path = os.path.join(MODEL_DIR, fname)
    if not os.path.exists(path):
        print(f"[skip] {name}: {path} not found")
        continue

    y_pred = load_model(path).predict(X)
    summary[name] = accuracy_score(y, y_pred)
    print(f"\n=== {name} ===")
    print(classification_report(y, y_pred, target_names=le.classes_, zero_division=0))
    print("Accuracy:", summary[name])

print(f"\n{'model':<8}{'accuracy':>10}")
for name, acc in sorted(summary.items(), key=lambda kv: -kv[1]):
    print(f"{name:<8}{acc*100:>9.1f}%")
