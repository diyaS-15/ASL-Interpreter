import pandas as pd 
from sklearn.preprocessing import LabelEncoder
import joblib

# import mediapipe landmarks of test-set
df = pd.read_csv('test-landmarks2.csv')
labels = df['label'].values
X = df.drop(columns=['label']).values

# saved models
mlp_model = joblib.load('asl_model.pkl')
rf_model = joblib.load('asl_rf_model.pkl')
svm_model = joblib.load('asl_svm_model.pkl')
le = joblib.load("label_encoder.pkl")  # label encoder used during training 
y = le.transform(labels)  # converts alphabets to number 

y_pred = mlp_model.predict(X)
y_rf_pred = rf_model.predict(X)
y_svm_pred = svm_model.predict(X)

from sklearn.metrics import classification_report, accuracy_score
print("MLP") #0.17
print(classification_report(y, y_pred, target_names=le.classes_))
print("Accuracy:", accuracy_score(y, y_pred))

print("RF") #0.22
print(classification_report(y, y_rf_pred, target_names=le.classes_))
print("Accuracy:", accuracy_score(y, y_rf_pred))

print("SVM") #0.28
print(classification_report(y, y_svm_pred, target_names=le.classes_))
print("Accuracy:", accuracy_score(y, y_svm_pred))
