from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import numpy as np
import joblib
import mediapipe as mp

app = FastAPI()

# allows Next.js frontend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only, restrict in prod! (CHANGE to frontend url, http;//app-name.com <- whatever its deployed on)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# load models
model = joblib.load("asl_model.pkl")
le = joblib.load("label_encoder.pkl")

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1)
mp_drawing = mp.solutions.drawing_utils

def extract_features(image: Image.Image, label_hand: str = None):
    """Process PIL Image w/ mediapipe & extract landmarks for prediction.""" # docstring for better understaning
    image_rgb = np.array(image.convert("RGB"))
    results = hands.process(image_rgb)
    if not results.multi_hand_landmarks:
        return None
    
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
            features.extend([x, y, z])
        if len(features) == 63:
            return np.array(features).reshape(1, -1)
    return None

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    # reads file
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    features = extract_features(image)
    if features is None:
        return {"error": "No hand detected"}
    # predicts + returns prediction
    prediction = model.predict(features)
    predicted_letter = le.inverse_transform(prediction)[0]
    return {"prediction": predicted_letter}

