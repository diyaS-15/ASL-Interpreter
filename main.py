import cv2
import mediapipe as mp
import numpy as np

# precict model 
import joblib
model = joblib.load('asl_model.pkl')
le = joblib.load("label_encoder.pkl")

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=1)
mp_drawing = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)
print("Starting ASL Predicts: ")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb_frame)

    predicted_letter = ""

    if results.multi_hand_landmarks:
        for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
            label = handedness.classification[0].label 
            wrist = hand_landmarks.landmark[0]
            features = []
            for lm in hand_landmarks.landmark:
                x = lm.x - wrist.x
                y = lm.y - wrist.y
                z = lm.z - wrist.z
                if label == "Left":
                    x *= -1
                features.extend([x,y,z])
            
            # Make prediction if feature size matches
            if len(features) == 63:
                features = np.array(features).reshape(1, -1)
                prediction = model.predict(features)
                predicted_letter = le.inverse_transform(prediction)[0] 

            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

    # Show predicted letter
    cv2.putText(frame, f"Prediction: {predicted_letter}", (10, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)

    cv2.imshow("ASL Live Prediction", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
