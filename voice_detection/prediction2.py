######## IMPORTS ##########
import sounddevice as sd
from scipy.io.wavfile import write
import librosa
import numpy as np
from tensorflow.keras.models import load_model
import os
import soundfile as sf
import speech_recognition as sr
import wave
from pydub import AudioSegment

####### ALL CONSTANTS #####
fs = 44100
seconds = 2
filename = "prediction.wav"
file_name = 'prediction.wav'
model_path = "seperateddata.h5"  # Path to the saved model
##### LOADING OUR SAVED MODEL and PREDICTING ###
model = load_model(model_path)
class_names = ["0", "1", "2", "3"]  # Class names
# 0=backgrund, 1=cry, 2=mama, 3=papa

recognizer = sr.Recognizer()

print("Prediction Started: ")

#path = os.path.join("testingsounds")
#file_names = os.listdir(path)


i = 0
while True:
#for file_name in file_names:
    print("Say Now: ")
    myrecording = sd.rec(int(seconds * fs), samplerate=fs, channels=2,dtype='int16')
    #myrecording = file_name
    sd.wait()
    sd.wait()
    write(filename, fs, myrecording)
    """
    filename = os.path.join(path, file_name)
    print(f"Processing file: {file_name}")
    """
    audio, sample_rate = librosa.load(filename)
    mfcc = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=40)  # Take the first channel if stereo

    # Reshape to match the model's expected input
    mfcc_padded = np.zeros((164, 40))  # Use the model's expected dimensions
    mfcc_padded[:mfcc.shape[1], :] = mfcc.T[:164, :]  # Pad with zeros if needed
    mfcc_reshaped = np.expand_dims(np.expand_dims(mfcc_padded, axis=0), axis=-1)

    # Predict the class of the captured audio
    prediction = model.predict(mfcc_reshaped, verbose = 0)
    predicted_class = np.argmax(prediction, axis=1)[0]
    confidence = np.max(prediction, axis=1)[0]
    

        # Load the audio file
    #with wave.open(file_name, 'rb') as wav_file:
    # Extract audio data
        #audio_data = wav_file.readframes(wav_file.getnframes())
    with sr.AudioFile(file_name) as source:
            # Listen for the data (load audio to memory)
        audio_data = recognizer.record(source)
    
    text = ''
    try:
        text = recognizer.recognize_google(audio_data, language = 'en-US')
        if ("mama" in text.lower()):
            print(f"2")
            #print(f"{class_names[predicted_class]} with confidence {confidence}")
        elif ("papa" in text.lower() or "dada" in text.lower() or "bubba" in text.lower()):
            print(f"3")
            #print(f"{class_names[predicted_class]} with confidence {confidence}")
        else :
            if confidence > 0.6:
                print(f"{class_names[predicted_class]}")
                #print(f"{class_names[predicted_class]} with confidence {confidence}")

                #print("Confidence:", predictioncry[:, 1])
            else:
                print(f"0")
                #print(f"Background Detected")
            # Recognize the speech
    except (sr.UnknownValueError or sr.RequestError) :   
        if confidence > 0.6:
                print(f"{class_names[predicted_class]}")
                #print(f"{class_names[predicted_class]} with confidence {confidence}")
                #print("Confidence:", predictioncry[:, 1])
        else:
            print(f"0") #bg
