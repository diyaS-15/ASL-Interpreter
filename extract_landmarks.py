"""
Step 1 of evaluation: extract MediaPipe hand landmarks from the image test sets
into CSVs. Resumable — if MediaPipe aborts (known intermittent macOS crash),
just run again and it continues from where it left off.

For every image we record: relative path, label, whether a hand was detected,
and (if detected) the 63 wrist-normalized (x,y,z) features. Undetected images
are kept as rows with detected=0 so detection rate can be computed later.
"""

import os
import sys
import csv

import cv2
import mediapipe as mp

DATASETS = ["test-set", "Test_Alphabet"]
IMG_EXTS = (".jpg", ".jpeg", ".png")
HEADER = ["image", "label", "detected"] + [f"f{i}" for i in range(63)]


def extract(image_bgr, hands):
    if image_bgr is None:
        return None
    result = hands.process(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
    if not result.multi_hand_landmarks:
        return None
    hand = result.multi_hand_landmarks[0]
    wrist = hand.landmark[0]
    feats = []
    for lm in hand.landmark:
        feats.extend([lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z])
    return feats if len(feats) == 63 else None


def already_done(csv_path):
    done = set()
    if os.path.exists(csv_path):
        with open(csv_path, newline="") as f:
            for row in csv.reader(f):
                if row and row[0] != "image":
                    done.add(row[0])
    return done


def process_dataset(data_dir):
    csv_path = f"landmarks_{data_dir}.csv"
    done = already_done(csv_path)
    is_new = not os.path.exists(csv_path)

    f = open(csv_path, "a", newline="")
    writer = csv.writer(f)
    if is_new:
        writer.writerow(HEADER)
        f.flush()

    for label in sorted(os.listdir(data_dir)):
        label_path = os.path.join(data_dir, label)
        if not os.path.isdir(label_path):
            continue
        label = label.upper()
        imgs = sorted(x for x in os.listdir(label_path) if x.lower().endswith(IMG_EXTS))
        # Recreate Hands per letter to limit resource buildup that triggers the crash.
        hands = mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=1)
        det = 0
        for img_name in imgs:
            rel = os.path.join(data_dir, label, img_name)
            if rel in done:
                if len(done):  # count previously-detected for the log only if needed
                    pass
                continue
            feats = extract(cv2.imread(os.path.join(label_path, img_name)), hands)
            if feats is not None:
                writer.writerow([rel, label, 1] + feats)
                det += 1
            else:
                writer.writerow([rel, label, 0] + [""] * 63)
            f.flush()
        hands.close()
        print(f"[{data_dir}] {label}: {len(imgs)} imgs "
              f"({len(imgs) - len([i for i in imgs if os.path.join(data_dir, label, i) in done])} new)"
              f", {det} newly detected", file=sys.stderr, flush=True)
    f.close()
    print(f"[{data_dir}] complete -> {csv_path}", file=sys.stderr, flush=True)


def main():
    targets = sys.argv[1:] or DATASETS
    for data_dir in targets:
        if not os.path.isdir(data_dir):
            print(f"[warn] missing: {data_dir}", file=sys.stderr)
            continue
        process_dataset(data_dir)


if __name__ == "__main__":
    main()
