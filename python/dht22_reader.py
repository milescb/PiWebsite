#!/usr/bin/env python3
import time
import json
import os
from datetime import datetime
import adafruit_dht 
import board

# Configuration
DHT_DEVICE = adafruit_dht.DHT22(board.D4)
DATA_DIR = "data"  
DATA_FILE = os.path.join(DATA_DIR, "sensor_data.json")
LOG_INTERVAL = 300 # log every five mins 

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def celcius_to_fahrenheit(temp_celcius):
    temp_fahrenheit = temp_celcius * (9./5.) + 32
    return temp_fahrenheit

def read_sensor(max_attempts = 5):
    """Read temperature and humidity from DHT22 sensor."""

    attempt = 0
    
    while attempt < max_attempts:
        try:
            humidity = DHT_DEVICE.humidity
            temperature = celcius_to_fahrenheit(DHT_DEVICE.temperature)
            
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

def save_data(reading):
    """Save reading to JSON file."""
    try:
        # Read existing data
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as file:
                data = json.load(file)
        else:
            data = {"readings": []}
        
        # Add new reading
        data["readings"].append(reading)
        
        # Limit to 300 readings (corresponds to about a day of data)
        if len(data["readings"]) > 300:
            data["readings"] = data["readings"][-300:]
        
        # Save current reading to a separate file for easy access by the web page
        with open(os.path.join(DATA_DIR, "current_reading.json"), 'w') as file:
            json.dump(reading, file)
        
        # Save all readings
        with open(DATA_FILE, 'w') as file:
            json.dump(data, file)
            
        return True
    except Exception as e:
        print(f"Error saving data: {e}")
        return False

def main():
    """Main function to read sensor and save data at regular intervals."""
    print("DHT22 Sensor Logger Started")
    print(f"Logging to {os.path.abspath(DATA_FILE)}")
    print(f"Reading every {LOG_INTERVAL} seconds")
    
    while True:
        reading = read_sensor()
        if reading:
            success = save_data(reading)
            if success:
                print(f"Logged: Temp={reading['temperature']}°F, Humidity={reading['humidity']}%")
            else:
                print("Failed to save data")
        
        time.sleep(LOG_INTERVAL)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Program stopped by user")
