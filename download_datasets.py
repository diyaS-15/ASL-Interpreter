import kagglehub
import os
import shutil
# Dataset path
destination = os.path.expanduser("/data/ASL_Alphabet")
# Download dataset
path = kagglehub.dataset_download("grassknoted/asl-alphabet")
# Move dataset contents
for item in os.listdir(path):
    shutil.move(os.path.join(path, item), destination)
# to see the destination of dataset
# print(f"Dataset cleaned and moved to: {destination}")

