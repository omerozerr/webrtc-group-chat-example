import time
import serial
import bluetooth

def parse_bluetooth_data(data):
    global temperature, bpm
    if "temperature" in data:
        temp_str = data.split("temperature: ")[1]
        temperature = float(temp_str)
    elif "bpm" in data:
        bpm_str = data.split("bpm=")[1].split(",")[0]
        bpm = float(bpm_str)

def is_bluetooth_connected(device_name):
    nearby_devices = bluetooth.discover_devices(lookup_names=True)
    for addr, name in nearby_devices:
        if name == device_name:
            return True
    return False

device_name = "HC-05"
while not is_bluetooth_connected(device_name):
    print(f"Waiting for {device_name} to connect...")
    time.sleep(3)

try:
    bluetooth_serial = serial.Serial("/dev/rfcomm7", 115200)
except serial.SerialException as e:
    print(f"Error connecting to {device_name}: {e}")
    exit(1)

while True:
    try:
        if bluetooth_serial.in_waiting > 0:
            data = bluetooth_serial.readline().decode("utf-8").strip()
            print(data)
            time.sleep(0.5)
    except serial.SerialException as e:
        print(f"Error reading from {device_name}: {e}")
        time.sleep(2)
