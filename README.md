# ASL Gesture Recognition
Real time ASL Interpreter that takes live webcam footage of ASL gestures and translates it to speech output. 

## Phase 1: Static Gesture Recognition using CNN 
CNN Model recognizes static ASL gestures, specifically the ASL alphabet 

### Steps/Process
1. Install opencv, mediapipe
    pip install opencv-python
    pip install mediapipe
3. Set up hand recognition using mediapipe hands
4. Install kagglehub
5. Log into kaggle and download a API Token (kaggle.json) and save kaggle.json into a new directory using mkdir -p ~/.kaggle mv ~/Downloads/kaggle.json ~/.kaggle/kaggle.json chmod 600 ~/.kaggle/kaggle.json
6. Download static gesture recognition dataset from kaggle

## Phase 2: Dynamic Gesture Recognition using RNN 
Sequence Model (RNN) recognizes dynamic ASL gestures
