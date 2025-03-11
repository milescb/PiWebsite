import time
from datetime import datetime

from .utils import celcius_to_fahrenheit

def read_sensor(dht_device, max_attempts=5):
    """Read temperature and humidity from DHT22 sensor."""
    attempt = 0
    while attempt < max_attempts:
        try:
            humidity = dht_device.humidity
            temperature = celcius_to_fahrenheit(dht_device.temperature)
            if humidity is not None and temperature is not None:
                return {
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "temperature": round(temperature, 1),
                    "humidity": round(humidity, 1)
                }
            else:
                print(f"Attempt {attempt+1}/{max_attempts}: Sensor returned None values. Retrying...")
        except RuntimeError as e:
            if "Checksum did not validate" in str(e):
                print(f"Attempt {attempt+1}/{max_attempts}: Checksum error. Retrying...")
            else:
                print(f"Attempt {attempt+1}/{max_attempts}: Runtime error: {e}. Retrying...")
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_attempts}: Unexpected error: {e}. Retrying...")
        
        # Increase attempt counter and wait before retry
        attempt += 1
        time.sleep(2)  # Wait 2 seconds between attempts
    
    # If we've exhausted all attempts
    print("Failed to get valid reading after multiple attempts")
    return None