######## IMPORTS ##########
import sounddevice as sd
from scipy.io.wavfile import write
import librosa
import numpy as np
from tensorflow.keras.models import load_model
import os
import soundfile as sf
import speech_recognition as sr
from nlgnpreprocess import *
import time


print(sd.query_devices())


####### ALL CONSTANTS #####
fs = 44100
seconds = 2
filename = "prediction.wav"
file_name = 'prediction.wav'
model_path = "/home/wattsup/Desktop/server/webrtc-group-chat-example/voice_detection/seperateddata_omer.h5"  # Path to the saved model
model_path_nlgn_withoutcry = "/home/wattsup/Desktop/server/webrtc-group-chat-example/voice_detection/nlgnseperateddata_cry_included_in_bg_20buckets.h5"  # Path to the saved model
##### LOADING OUR SAVED MODEL and PREDICTING ###
model = load_model(model_path)
#model_nlgn_withcry = load_model(model_path_nlgn_withcry)
model_nlgn_withoutcry = load_model(model_path_nlgn_withoutcry)
class_names = ["bg", "cry", "mama", "papa"]  # Class names
class_names_nlgn_withoutcry = ["bg", "mama", "papa"]  # Class names nlgn
#class_names_nlgn_withcry = ["bg","cry", "mama", "papa"]  # Class names nlgn
recognizer = sr.Recognizer()

print("Prediction Started: ")

#path = os.path.join("testingsounds")
#file_names = os.listdir(path)


i = 0
while True:
#for file_name in file_names:
    print("Say Now: ")
    while True:
        try:
            myrecording = sd.rec(int(seconds * fs), samplerate=fs, channels=1, dtype='int16', device="hw:3,0")
            sd.wait()
            write(filename, fs, myrecording)
            break  # If the try block is successful, break out of the loop
        except Exception as e:
            print(f"An error occurred: {e}. Retrying in 1 second...")
            time.sleep(1)  # Wait for 1 second before retrying

    #myrecording = file_name

    """
    filename = os.path.join(path, file_name)
    print(f"Processing file: {file_name}")
    """
    audio, sample_rate = librosa.load(filename)

    mfcc = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=40)  # Take the first channel if stereo

    # Reshape to match the model's expected input
    mfcc_padded = np.zeros((192, 40))  # Use the model's expected dimensions
    mfcc_padded[:mfcc.shape[1], :] = mfcc.T[:192, :]  # Pad with zeros if needed
    mfcc_reshaped = np.expand_dims(np.expand_dims(mfcc_padded, axis=0), axis=-1)

    # Predict the class of the captured audio
    prediction = model.predict(mfcc_reshaped, verbose = 0)
    predicted_class = np.argmax(prediction, axis=1)[0]
    confidence = np.max(prediction, axis=1)[0]
    
    mfcc_nlgn = wav2mfcc(filename, n_mfcc=20, max_len=11)
    mfcc_nlgn = np.expand_dims(mfcc_nlgn, axis=0)  # Add batch size dimension
    mfcc_nlgn = np.expand_dims(mfcc_nlgn, axis=-1)  # Add channel dimension

    #mfcc_nlgn_withcry = wav2mfcc(filename, n_mfcc=40, max_len=11)
    #mfcc_nlgn_withcry = np.expand_dims(mfcc_nlgn_withcry, axis=0)  # Add batch size dimension
    #mfcc_nlgn_withcry = np.expand_dims(mfcc_nlgn_withcry, axis=-1)  # Add channel dimension

    #prediction_nlgn_withcry = model_nlgn_withcry.predict(mfcc_nlgn_withcry)
    prediction_nlgn_withoutcry = model_nlgn_withoutcry.predict(mfcc_nlgn, verbose = 0)
    #predicted_class_nlgn_withcry = np.argmax(prediction_nlgn_withcry, axis=1)[0]
    predicted_class_nlgn_withoutcry = np.argmax(prediction_nlgn_withoutcry, axis=1)[0]
    #confidence_nlgn_withcry = np.max(prediction_nlgn_withcry, axis=1)[0]
    confidence_nlgn_withoutcry = np.max(prediction_nlgn_withoutcry, axis=1)[0]

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
        #print(f"{text}")
        if ("mama" in text.lower()):
            print(f"mama")
            #print(f"{class_names[predicted_class]} with confidence {confidence}")
        elif ("papa" in text.lower() or "dada" in text.lower() or "bubba" in text.lower() or "bye-bye" in text.lower() or "baba" in text.lower()):
            print(f"papa")
            #print(f"{class_names[predicted_class]} with confidence {confidence}")
        elif (confidence > 0.8 and predicted_class == 1) :
            print(f"{class_names[predicted_class]}")
        elif confidence_nlgn_withoutcry > 0.85:
            print(f"{class_names_nlgn_withoutcry[predicted_class_nlgn_withoutcry]}")
        else :
            print(f"bg")
            # Recognize the speech
    except (sr.UnknownValueError or sr.RequestError) :   
        if (confidence > 0.8 and predicted_class == 1) :
            print(f"{class_names[predicted_class]}")
                #print("Confidence:", predictioncry[:, 1])
        elif confidence_nlgn_withoutcry > 0.8:
            print(f"{class_names_nlgn_withoutcry[predicted_class_nlgn_withoutcry]}")
                #print("Confidence:", predictioncry[:, 1])            
        else:
            print(f"bg")
