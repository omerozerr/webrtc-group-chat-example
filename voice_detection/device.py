import sounddevice as sd
import logging

# Set up logging
logging.basicConfig(filename='/home/wattsup/device_info.log', level=logging.DEBUG, format='%(asctime)s - %(message)s')

def log_sound_devices():
    # Get and log information about all available devices
    devices = sd.query_devices()
    logging.debug("Available audio devices:")
    for index, device in enumerate(devices):
        logging.debug(f"Device {index}: {device}")

    # Log the default device
    default_device = sd.default.device
    logging.debug(f"Default input device: {devices[default_device[0]]['name']} if input is available")
    logging.debug(f"Default output device: {devices[default_device[1]]['name']} if output is available")

try:
    log_sound_devices()
except Exception as e:
    logging.error(f"Error querying devices: {str(e)}")

