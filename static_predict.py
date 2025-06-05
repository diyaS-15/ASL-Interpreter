import pandas as pd
from glob import glob
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib

# combine all alphabets into one csv file 
df = [] 
files = glob("data/asl_*.csv")
df = [pd.read_csv(f) for f in files]
full_df = pd.concat(df, ignore_index=True)

# separates features + labels (iloc[rows, cols])
full_df.iloc[:, -1] = full_df.iloc[:, -1].str[0]
X = full_df.iloc[:, :-1] 
Y = full_df.iloc[:, -1] 

# encode letters bc most ML models can't work with alphabets
le = LabelEncoder()
y_enc = le.fit_transform(Y)
joblib.dump(le, "label_encoder.pkl")

# split dataset (stratify allows for class balance)
X_train, X_test, Y_train, Y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42, stratify=y_enc)

# MLP model (multi-layer perceptron)
mlpmodel = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=500, random_state=42)
mlpmodel.fit(X_train, Y_train)
Y_predict = mlpmodel.predict(X_test)

print(classification_report(Y_test, Y_predict))
print(confusion_matrix(Y_test, Y_predict))

joblib.dump(mlpmodel, 'asl_model.pkl')
print("MLP updated")

# RF model (random forest)
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train, Y_train)
Y_predict = rf_model.predict(X_test)

#print(classification_report(Y_test, Y_predict))
#print(confusion_matrix(Y_test, Y_predict))

joblib.dump(rf_model, 'asl_rf_model.pkl')
print("RF updated")

# SVM model (support vector machine)
svm_model = SVC(kernel='rbf', probability=True, random_state=42)
svm_model.fit(X_train, Y_train)
Y_predict = svm_model.predict(X_test)


#print(classification_report(Y_test, Y_predict))
#print(confusion_matrix(Y_test, Y_predict))

joblib.dump(svm_model, 'asl_svm_model.pkl')
print("SVM updated")


