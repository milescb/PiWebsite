#!/usr/bin/env python3
import os
import json
import sqlite3
import paho.mqtt.client as mqtt
from datetime import datetime

# SQLite Database Setup
DATA_DIR = "data"
DB_FILE = os.path.join(DATA_DIR, "sensor_data.db")

def init_db():
    """Initialize the SQLite database."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_type TEXT,
            location TEXT,
            timestamp TEXT,
            value REAL
        )
    ''')
    conn.commit()
    conn.close()

# MQTT Configuration
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPICS = [
    ("sensor/temperature/livingroom", 1),
    ("sensor/temperature/bedroom", 1),
    ("sensor/humidity/livingroom", 1),
    ("sensor/humidity/bedroom", 1),
    ("sensor/moisture/plant1", 1),
    ("sensor/moisture/plant2", 1),
    ("sensor/moisture/plant3", 1)
]
MQTT_CLIENT_ID = "sensor_subscriber"

def save_current_readings(value, sensor_type, location, timestamp):
    with open(os.path.join(DATA_DIR, f"{sensor_type}_{location}.json"), 'w') as file:
        dic = {sensor_type: value, "timestamp": timestamp}
        json.dump(dic, file)
        
def save_to_db(sensor_type, location, value):
    """Save the sensor reading to the SQLite database."""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO sensor_data (sensor_type, location, timestamp, value)
            VALUES (?, ?, ?, ?)
        ''', (sensor_type, location, timestamp, value))
        conn.commit()
        conn.close()
        print(f"Saved: {sensor_type} in {location} = {value} at {timestamp}")
    except Exception as e:
        print(f"Error saving to database: {e}")

def on_connect(client, userdata, flags, rc):
    """Callback when connected to the MQTT broker."""
    if rc == 0:
        print(f"Connected to MQTT broker at {MQTT_BROKER}")
        for topic, qos in MQTT_TOPICS:
            client.subscribe(topic, qos)
            print(f"Subscribed to {topic}")
    else:
        print(f"Failed to connect, code: {rc}")

def on_message(client, userdata, msg):
    """Process received MQTT messages."""
    try:
        payload = msg.payload.decode("utf-8")
        reading = json.loads(payload)

        topic_parts = msg.topic.split("/")
        sensor_type = topic_parts[1]  # temperature, humidity, moisture
        location = topic_parts[2]  # room1, room2, plant1, etc.

        if "value" in reading:
            value = float(reading["value"])
            save_to_db(sensor_type, location, value)
            if "room" in location:
                save_current_readings(value, sensor_type, location, 
                                      datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        else:
            print(f"Invalid data format: {reading}")

    except json.JSONDecodeError:
        print(f"Error: Invalid JSON received: {payload}")
    except Exception as e:
        print(f"Error processing message: {e}")

def main():
    """Main function to start the MQTT subscriber."""
    init_db()
    print("MQTT Subscriber for Sensor Data Started")

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
