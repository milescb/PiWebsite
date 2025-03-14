#!/usr/bin/env python3
import json
import os
import paho.mqtt.client as mqtt
from datetime import datetime

DATA_DIR = "data"
DATA_FILE = os.path.join(DATA_DIR, "sensor_data.json")

MQTT_BROKER = "localhost" 
MQTT_PORT = 1883
MQTT_TOPIC = "sensor/dht22"
MQTT_CLIENT_ID = "dht22_subscriber"

os.makedirs(DATA_DIR, exist_ok=True)

def save_data(reading):
    """Save reading to JSON file."""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as file:
                data = json.load(file)
        else:
            data = {"readings": []}
            
        data["readings"].append(reading)
        
        # Limit to 300 readings (corresponds to about a day of data)
        if len(data["readings"]) > 300:
            data["readings"] = data["readings"][-300:]
            
        # Save current reading to a separate file for easy access by the web page
        with open(os.path.join(DATA_DIR, "current_reading.json"), 'w') as file:
            json.dump(reading, file)
            
        with open(DATA_FILE, 'w') as file:
            json.dump(data, file)
            
        return True
    except Exception as e:
        print(f"Error saving data: {e}")
        return False

def on_connect(client, userdata, flags, rc):
    """Callback for when the client receives a CONNACK response from the server."""
    if rc == 0:
        print(f"Connected to MQTT broker at {MQTT_BROKER}")
        client.subscribe(MQTT_TOPIC, qos=1)
        print(f"Subscribed to topic: {MQTT_TOPIC}")
    else:
        print(f"Failed to connect to MQTT broker with code: {rc}")

def on_message(client, userdata, msg):
    """Callback for when a message is received from the broker."""
    try:
        payload = msg.payload.decode("utf-8")
        reading = json.loads(payload)
        
        print(f"Received: Temp={reading['temperature']}°F, Humidity={reading['humidity']}% at {reading['timestamp']}")
        
        if save_data(reading):
            print(f"Data saved to {DATA_FILE}")
        else:
            print("Failed to save data")
            
    except json.JSONDecodeError:
        print(f"Error: Received invalid JSON: {payload}")
    except Exception as e:
        print(f"Error processing message: {e}")

def main():
    """Main function to subscribe to MQTT topic and receive data."""
    print("DHT22 Sensor MQTT Subscriber Started")
    print(f"Data will be saved to {os.path.abspath(DATA_FILE)}")
    
    client = mqtt.Client(client_id=MQTT_CLIENT_ID)
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        
        client.loop_forever()
        
    except KeyboardInterrupt:
        print("Program stopped by user")
        client.disconnect()
    except Exception as e:
        print(f"Unexpected error: {e}")
        client.disconnect()

if __name__ == "__main__":
    main()