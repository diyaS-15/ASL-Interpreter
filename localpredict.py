"""
Local live test: webcam -> MediaPipe landmarks -> predicted letter, on screen.

Usage (from the repo root, in an env with cv2 + mediapipe):
    python localpredict.py          # CNN (default)
    python localpredict.py SVM      # or MLP / RF / SVM

The CNN runs through cnn_predict's NumPy forward pass, so it can sit in the same
process as MediaPipe. Loading torch or tensorflow here instead would crash the
process -- see CLAUDE.md.
"""

import os
import sys

import cv2
import joblib
import mediapipe as mp
import numpy as np

from cnn_predict import LandmarkCNNPredictor

MODEL_DIR = "other_models"
MODELS = {
    "MLP": "asl_model.pkl",
    "RF": "asl_rf_model.pkl",
    "SVM": "asl_svm_model.pkl",
    "CNN": "asl_cnn_model.npz",
}
# capture_data.py recorded training samples with no handedness flip, so mirroring
# left hands here would feed the model a convention it never saw. Flip to True to
# A/B that mismatch (backend/main.py currently does mirror).
MIRROR_LEFT_HAND = False
# Below this confidence the frame is reported as uncertain rather than as a letter.
MIN_CONFIDENCE = 0.6


def load(name):
    if name not in MODELS:
        raise SystemExit(f"unknown model {name!r}; choose from {', '.join(MODELS)}")
    path = os.path.join(MODEL_DIR, MODELS[name])
    if not os.path.exists(path):
        raise SystemExit(f"{path} not found — train it first")
    model = LandmarkCNNPredictor.load(path) if path.endswith(".npz") else joblib.load(path)
    return model, joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))


def features_from(hand_landmarks, handedness_label):
    wrist = hand_landmarks.landmark[0]
    feats = []
    for lm in hand_landmarks.landmark:
        x = lm.x - wrist.x
        if MIRROR_LEFT_HAND and handedness_label == "Left":
            x *= -1
        feats.extend([x, lm.y - wrist.y, lm.z - wrist.z])
    return np.array(feats, dtype=np.float32).reshape(1, -1) if len(feats) == 63 else None


def main():
    name = (sys.argv[1] if len(sys.argv) > 1 else "CNN").upper()
    model, le = load(name)
    print(f"Starting ASL predictions using {name} (q to quit)")

    hands = mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=1)
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        results = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        caption = "no hand detected"

        if results.multi_hand_landmarks:
            for hand_landmarks, handedness in zip(results.multi_hand_landmarks,
                                                  results.multi_handedness):
                feats = features_from(hand_landmarks, handedness.classification[0].label)
                if feats is not None:
                    idx = int(model.predict(feats)[0])
                    letter = le.inverse_transform([idx])[0]
                    conf = float(model.predict_proba(feats)[0][idx])
                    caption = (f"{letter}  ({conf:.0%})" if conf >= MIN_CONFIDENCE
                               else f"unsure - closest {letter} ({conf:.0%})")
                mp.solutions.drawing_utils.draw_landmarks(
                    frame, hand_landmarks, mp.solutions.hands.HAND_CONNECTIONS
                )

        cv2.putText(frame, f"{name}: {caption}", (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 3)
        cv2.imshow("ASL Live Prediction", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
