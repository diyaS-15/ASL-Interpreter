import cv2
import mediapipe as mp
import numpy as np
import os
import csv
from tqdm import tqdm

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1)
data = []
labels = []
data_dir = "Test_Alphabet"  

for label in sorted(os.listdir(data_dir)):
    label_path = os.path.join(data_dir, label)
    if not os.path.isdir(label_path):
        continue

    for img_name in tqdm(os.listdir(label_path), desc=f"Processing {label}"):
        img_path = os.path.join(label_path, img_name)
        image = cv2.imread(img_path)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        result = hands.process(image_rgb)

        if result.multi_hand_landmarks:
            hand_landmarks = result.multi_hand_landmarks[0]
            wrist = hand_landmarks.landmark[0]
            features = []

            for lm in hand_landmarks.landmark:
                features.extend([
                    lm.x - wrist.x,
                    lm.y - wrist.y,
                    lm.z - wrist.z
                ])

            if len(features) == 63:
                data.append(features)
                labels.append(label.upper())

with open('test-landmarks2.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['label'] + [f'feature_{i}' for i in range(63)])
    for lbl, feat in zip(labels, data):
        writer.writerow([lbl] + feat)



