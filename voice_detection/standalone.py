import sounddevice as sd
from scipy.io.wavfile import write
import time

# Constants
fs = 44100
seconds = 2
filename = "diagnostic_test.wav"
device = "hw:3,0"

print(sd.query_devices())

while True:
    try:
        print("Recording...")
        myrecording = sd.rec(int(seconds * fs), samplerate=fs, channels=1, dtype='int16', device=device)
        sd.wait()
        write(filename, fs, myrecording)
        print(f"Recording saved to {filename}")
        break
    except Exception as e:
        print(f"An error occurred: {e}. Retrying in 1 second...")
        time.sleep(1)  # Wait for 1 second before retrying
