"""
Step 2 of evaluation: score the extracted landmark CSVs against the trained
models and write results.json. Pure sklearn/NumPy/pandas (no MediaPipe, no
torch/tensorflow), so it cannot crash.

Accuracy is computed only over images where a hand was detected; detection_rate
reports what fraction of each set was testable.
"""

import os
import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import accuracy_score, classification_report

from cnn_predict import LandmarkCNNPredictor

MODEL_DIR = "other_models"
DATASETS = ["test-set", "Test_Alphabet"]
MODELS = {
    "MLP": "asl_model.pkl",
    "RF": "asl_rf_model.pkl",
    "SVM": "asl_svm_model.pkl",
    "CNN": "asl_cnn_model.npz",
}
FEATURE_COLS = [f"f{i}" for i in range(63)]
OUTPUT_JSON = "results.json"


def score_dataset(data_dir, le, models):
    df = pd.read_csv(f"landmarks_{data_dir}.csv")
    total = len(df)
    det_df = df[df["detected"] == 1].copy()
    detected = len(det_df)

    per_class_detection = {
        label: {
            "total": int((df["label"] == label).sum()),
            "detected": int(((df["label"] == label) & (df["detected"] == 1)).sum()),
        }
        for label in sorted(df["label"].unique())
    }

    result = {
        "path": data_dir,
        "total_images": total,
        "detected_images": detected,
        "undetected_images": total - detected,
        "detection_rate": round(detected / total, 4) if total else 0.0,
        "num_classes": int(df["label"].nunique()),
        "per_class_detection": per_class_detection,
        "models": {},
    }
    if detected == 0:
        return result

    X = det_df[FEATURE_COLS].to_numpy(dtype=np.float32)
    y_true = le.transform(det_df["label"].to_numpy())
    class_labels = np.arange(len(le.classes_))

    for name, model in models.items():
        y_pred = model.predict(X)
        rep = classification_report(
            y_true, y_pred, labels=class_labels, target_names=list(le.classes_),
            output_dict=True, zero_division=0,
        )
        per_class = {
            cls: {
                "precision": round(rep[cls]["precision"], 4),
                "recall": round(rep[cls]["recall"], 4),
                "f1": round(rep[cls]["f1-score"], 4),
                "support": int(rep[cls]["support"]),
            }
            for cls in le.classes_ if cls in rep
        }
        result["models"][name] = {
            "accuracy_on_detected": round(float(accuracy_score(y_true, y_pred)), 4),
            "correct": int((y_pred == y_true).sum()),
            "macro_f1": round(rep["macro avg"]["f1-score"], 4),
            "weighted_f1": round(rep["weighted avg"]["f1-score"], 4),
            "per_class": per_class,
        }
    return result


def load_model(path):
    if path.endswith(".npz"):
        return LandmarkCNNPredictor.load(path)
    return joblib.load(path)


def main():
    le = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
    models = {}
    for name, fname in MODELS.items():
        path = os.path.join(MODEL_DIR, fname)
        if os.path.exists(path):
            models[name] = load_model(path)
        else:
            print(f"[skip] {name}: {path} not found")

    output = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "model_source": MODEL_DIR,
        "preprocessing": "MediaPipe Hands, 63 wrist-normalized (x,y,z) features, no handedness flip",
        "note": "accuracy_on_detected covers only images where a hand was detected; "
                "detection_rate gives coverage.",
        "datasets": {ds: score_dataset(ds, le, models) for ds in DATASETS},
    }
    with open(OUTPUT_JSON, "w") as f:
        json.dump(output, f, indent=2)

    # Console summary
    print(f"{'dataset':<16}{'detect%':>9}" + "".join(f"{m:>8}" for m in models))
    for ds, r in output["datasets"].items():
        row = f"{ds:<16}{r['detection_rate']*100:>8.1f}%"
        for m in models:
            acc = r["models"].get(m, {}).get("accuracy_on_detected")
            row += f"{acc*100:>7.1f}%" if acc is not None else f"{'-':>8}"
        print(row)
    print(f"\nWrote {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
