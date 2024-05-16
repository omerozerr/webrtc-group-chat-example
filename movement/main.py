from gpiozero import InputDevice
from time import sleep

# Replace '17' with the GPIO pin number you are using
data_pin = InputDevice(17)

try:
    while True:
        # Check if the pin is high
        if data_pin.is_active:
            print("movement")
        sleep(3)  # Delay for 1 second before checking again
except KeyboardInterrupt:
    print("Program stopped")
