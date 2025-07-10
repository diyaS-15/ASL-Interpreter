FROM python:3.10.11-bullseye

WORKDIR /app 

# for mediapipe and PIL 
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libasound2-dev \
    ffmpeg \
    libjpeg-dev \
    zlib1g-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt . 

RUN pip install --upgrade pip && pip install -r requirements.txt

COPY backend/ . 

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]