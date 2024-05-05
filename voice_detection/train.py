import os
import numpy as np
import pandas as pd
import librosa
from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Conv2D, MaxPooling2D, Flatten
from sklearn.metrics import classification_report
from matplotlib import pyplot as plt
from tensorflow.keras.regularizers import l2
from tensorflow.keras.callbacks import EarlyStopping

# Function to extract MFCC features without averaging
def extract_full_mfcc_features(file_name):
    try:
        audio, sample_rate = librosa.load(file_name, res_type='kaiser_fast')
        mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=40)
    except Exception as e:
        print(f"Error encountered while parsing file: {file_name}. Exception: {e}")
        return None 
    return mfccs


# Directories containing your audio files
data_path_dict = {
    0: ["backgroundtrain_augmented_cropped/" + file_path for file_path in os.listdir("backgroundtrain_augmented_cropped/")],
    1: ["cryingtraindata_augmented_cropped/" + file_path for file_path in os.listdir("cryingtraindata_augmented_cropped/")],
    2: ["mamatraindata_merge_augmented_new/" + file_path for file_path in os.listdir("mamatraindata_merge_augmented_new/")],
    3: ["papatraindata_merge_augmented_new/" + file_path for file_path in os.listdir("papatraindata_merge_augmented_new/")],
}

# Additional directories for validation data
validation_path_dict = {
    0: ["background_test/" + file for file in os.listdir("background_test/")],
    1: ["cry_test/" + file for file in os.listdir("cry_test/")],
    2: ["mama_test/" + file for file in os.listdir("mama_test/")],
    3: ["papa_test/" + file for file in os.listdir("papa_test/")]
}

# Initialize list to hold all MFCCs and labels
all_mfccs = []
all_labels = []

# Calculate maximum sequence length
max_len = 0
for class_label, files in data_path_dict.items():
    for file in files:
        mfccs = extract_full_mfcc_features(file)
        if mfccs is not None:
            if mfccs.shape[1] > max_len:
                max_len = mfccs.shape[1]
            all_mfccs.append(mfccs)
            all_labels.append(class_label)

# Load validation data
val_mfccs, val_labels = [], []
for class_label, files in validation_path_dict.items():
    for file in files:
        mfccs = extract_full_mfcc_features(file)
        if mfccs is not None:
            if mfccs.shape[1] > max_len:
                max_len = mfccs.shape[1]
            val_mfccs.append(mfccs)
            val_labels.append(class_label)

# Padding the sequences
X_train = pad_sequences([mfcc.T for mfcc in all_mfccs], maxlen=max_len, padding='post', dtype='float32')
y_train = to_categorical(np.array(all_labels))
X_val = pad_sequences([mfcc.T for mfcc in val_mfccs], maxlen=max_len, padding='post', dtype='float32')
y_val = to_categorical(np.array(val_labels))

# Reshape for CNN input
X_train = X_train.reshape((X_train.shape[0], X_train.shape[1], X_train.shape[2], 1))
X_val = X_val.reshape((X_val.shape[0], X_val.shape[1], X_val.shape[2], 1))

early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

# Define the CNN model architecture
model = Sequential([
    # First convolutional layer
    Conv2D(16, kernel_size=(5, 5), activation='relu', input_shape=(X_train.shape[1], X_train.shape[2], 1), padding='same'),
    MaxPooling2D(pool_size=(2, 2)),
    Dropout(0.2),

    # Second convolutional layer
    Conv2D(32, kernel_size=(3, 3), activation='relu', padding='same'),
    MaxPooling2D(pool_size=(2, 2)),
    Dropout(0.2),

    # Flatten the 3D output to 2D for input to the fully connected layers
    Flatten(),
    
    # First fully connected layer
    Dense(64, activation='relu', kernel_regularizer=l2(0.001)),
    Dropout(0.2),

    # Output layer
    Dense(y_train.shape[1], activation='softmax')
])


model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])

history = model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=40, batch_size=8, callbacks=[early_stopping])


# Evaluate the model

model.save('seperateddata.h5')

# Predict classes on the test set
y_pred = model.predict(X_val)
y_pred_classes = np.argmax(y_pred, axis=1)
y_true = np.argmax(y_val, axis=1)

# Calculate and print classification report
print(classification_report(y_true, y_pred_classes, target_names=['backgroundtrain', 'cryingtraindata', 'mamatraindata', 'papatraindata']))

# Plotting training and validation accuracy
plt.plot(history.history['accuracy'], label='Training accuracy')
plt.plot(history.history['val_accuracy'], label='Validation accuracy')
plt.title('Training and Validation Accuracy')
plt.legend()
plt.show()
