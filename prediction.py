import numpy as np
import sounddevice as sd
import librosa
from tensorflow.keras.models import load_model
import socketio
import ssl

# Constants
fs = 22050  # Sample rate
seconds = 2  # Duration of recording
class_names = ["bg", "cry", "mama", "papa"]  # Class names
model_path = "/home/wattsup/Desktop/server/webrtc-group-chat-example/voice_detection/seperateddata.h5"  # Path to the saved model

# Load model
model = load_model(model_path)

while True:
    # Record audio
    myrecording = sd.rec(int(seconds * fs), samplerate=fs, channels=1)
    sd.wait()  # Wait until recording is finished
    
    # Extract MFCC features
    mfcc = librosa.feature.mfcc(y=myrecording[:,0], sr=fs, n_mfcc=40)
    
    # Reshape to match the model's expected input
    mfcc_padded = np.zeros((192, 40))
    mfcc_padded[:mfcc.shape[1], :] = mfcc.T[:192, :]
    mfcc_reshaped = np.expand_dims(np.expand_dims(mfcc_padded, axis=0), axis=-1)

    # Predict the class of the captured audio
    prediction = model.predict(mfcc_reshaped, verbose = 0)
    predicted_class = np.argmax(prediction, axis=1)[0]
    confidence = np.max(prediction, axis=1)[0]

    # Output the prediction result
    print(f"{class_names[predicted_class]} with confidence {confidence}")
