from gpiozero import InputDevice
from time import sleep

data_pin = InputDevice(27)

try:
    while True:
        # Check if the pin is high
        if data_pin.is_active:
            print("movement")
            sleep(8)
        else:
            print("notmoving")
        sleep(1)  # Delay for 1 second before checking again
except KeyboardInterrupt:
    print("Program stopped")
