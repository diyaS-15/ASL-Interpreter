import mediapipe as mp
import cv2 
import numpy as np
import pandas as pd
import time

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=1)
mp_drawing = mp.solutions.drawing_utils

# CSV data storage
data = []
label = input("Enter ASL label (e.g., A): ").upper()

#starts collection webcam
cap = cv2.VideoCapture(0)
print("Collecting data for label:", label)
time.sleep(2)

# current count + max samples for this label 
count = 0
MAX_SAMPLES = 100 

while cap.isOpened() and count < MAX_SAMPLES:
    # image captured = success, else exit program 
    success, image = cap.read()
    if not success:
        break

    image = cv2.flip(image, 1)
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb_image)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            # Normalized relative to wrist
            wrist = hand_landmarks.landmark[0]
            landmark_row = []
            for lm in hand_landmarks.landmark:
                landmark_row.extend([
                    lm.x - wrist.x,
                    lm.y - wrist.y,
                    lm.z - wrist.z
                ])
            landmark_row.append(label)
            data.append(landmark_row)
            count += 1
            mp_drawing.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS)

    cv2.putText(image, f"Label: {label}, Samples: {count}/{MAX_SAMPLES}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    cv2.imshow('ASL Data Collection', image)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

# Save to CSV
columns = [f"{axis}{i}" for i in range(21) for axis in ["x", "y", "z"]] + ["label"]
df = pd.DataFrame(data, columns=columns)
df.to_csv(f'data/asl_{label}.csv', index=False)
print(f"Saved {count} samples to data/asl_{label}.csv")

print("Sample row length:", len(data[0]))

print(df.shape)  # (100, 64)
print(df.columns[-5:]) 