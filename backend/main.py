from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import numpy as np
import joblib
import mediapipe as mp
import os 
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import Column, Integer, String
from pydantic import BaseModel
from typing import List

load_dotenv()
app = FastAPI()

# DATABASE SETUP
DB_HOST = os.getenv("HOST")
DB_PORT = "5432"
DB_NAME = os.getenv("NAME")
DB_USER = "postgres"
DB_PASS = os.getenv("PASS")

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLALCHEMY DB MODEL
class Player(Base):
    __tablename__ = 'players'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    points = Column(Integer, default=0)

# Create table if nonexistent
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

# PYDANTIC MODEL
class PlayerCreate(BaseModel):
    username: str

class PlayerOut(BaseModel):
    id:int
    username: str
    points: int

    class Config:
        orm_mode = True

# allows Next.js frontend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only, restrict in prod! (CHANGE to frontend url, http;//app-name.com <- whatever its deployed on)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# load asl models
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

@app.get("/")
async def root():
    return{"message":"welcome to asl hangman"}

# add player 
@app.post("/players/", response_model=PlayerOut)
def add_player(player: PlayerCreate, db: Session=Depends(get_db)):
    db_player = db.query(Player).filter(Player.username == player.username).first()
    if db_player: 
        return db_player
    new_player = Player(username=player.username, points=0)
    db.add(new_player)
    db.commit()
    db.refresh(new_player)
    return new_player

# show all players (leaderboard)
@app.get("/leaderboard/", response_model=List[PlayerOut])
def get_leaderboard(db:Session=Depends(get_db)):
    return db.query(Player).order_by(Player.points.desc()).all()

# delete/clear leaderboard (testing)
@app.delete("/leaderboard/")
def delete_leaderboard(db:Session=Depends(get_db)):
    deleted = db.query(Player).delete()
    db.commit()
    return{"message":f"{deleted} players deleted from leaderboard"}

# add points
@app.post("/players/{username}/add-points/")
def add_points(username:str, db:Session=Depends(get_db)):
    player = db.query(Player).filter(Player.username == username).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player does not exist")
    player.points += 5
    db.commit()
    return{"messgae":f"5 points added to {username}", "total points":player.points}

