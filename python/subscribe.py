#!/usr/bin/env python3
import os
import json
import sqlite3
import threading
import time
import paho.mqtt.client as mqtt
from datetime import datetime

# SQLite Database Setup
DATA_DIR = "data"
DB_FILE = os.path.join(DATA_DIR, "sensor_data.db")

# Buffer for batch writing
data_buffer = []
BUFFER_LOCK = threading.Lock()
BATCH_INTERVAL = 600  # Write to SQLite every 10 minutes (600 seconds)

def init_db(use_indexes=False):
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
MQTT_BROKER = "10.0.0.253"
MQTT_PORT = 1883
MQTT_TOPICS = [
    ("sensor/temperature/livingroom", 1),
    ("sensor/temperature/bedroom", 1),
    ("sensor/humidity/livingroom", 1),
    ("sensor/humidity/bedroom", 1),
    ("sensor/moisture/snake_plant", 1),
    ("sensor/moisture/spotted_begonia", 1),
    ("sensor/moisture/jade_plant", 1),
    ("sensor/moisture/asparagus_fern", 1),
    ("sensor/moisture/rubber_plant", 1),
    ("sensor/moisture/prayer_plant", 1),
    ("sensor/moisture/norfolk_pine", 1),
    ("sensor/moisture/arrowhead_plant", 1),
    ("sensor/moisture/nanouk", 1),
]
MQTT_CLIENT_ID = "sensor_subscriber"

def save_current_readings(value, sensor_type, location, timestamp):
    """Save the latest reading in a JSON file (stored in RAM)."""
    with open(f"data/json_data/{sensor_type}_{location}.json", 'w') as file:
        json.dump({sensor_type: value, "timestamp": timestamp}, file)

def batch_write_to_db():
    """Writes accumulated sensor data to the database in batch mode."""
    global data_buffer
    while True:
        time.sleep(BATCH_INTERVAL)
        with BUFFER_LOCK:
            if data_buffer:
                try:
                    conn = sqlite3.connect(DB_FILE)
                    cursor = conn.cursor()

                    # Apply SQLite optimizations
                    cursor.execute("PRAGMA journal_mode=WAL;")
                    cursor.execute("PRAGMA synchronous=NORMAL;")
                    cursor.execute("PRAGMA temp_store=MEMORY;")
                    cursor.execute("PRAGMA cache_size=-4096;")
                    cursor.execute("PRAGMA busy_timeout=3000;")
                    cursor.execute("PRAGMA wal_autocheckpoint=100;")

                    # Batch insert
                    cursor.executemany('''
                        INSERT INTO sensor_data (sensor_type, location, timestamp, value)
                        VALUES (?, ?, ?, ?)
                    ''', data_buffer)

                    conn.commit()
                    conn.close()
                    print(f"Batch saved {len(data_buffer)} records to database.")
                    data_buffer = []  # Clear buffer after writing
                except Exception as e:
                    print(f"Error during batch save: {e}")

def save_to_buffer(sensor_type, location, value):
    """Save the sensor reading to the buffer for batch writing."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with BUFFER_LOCK:
        data_buffer.append((sensor_type, location, timestamp, value))

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
            save_to_buffer(sensor_type, location, value)
            save_current_readings(value, sensor_type, location, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        else:
            print(f"Invalid data format: {reading}")

    except json.JSONDecodeError:
        print(f"Error: Invalid JSON received: {payload}")
    except Exception as e:
        print(f"Error processing message: {e}")

def graceful_shutdown():
    """Write any remaining buffered data before exiting."""
    with BUFFER_LOCK:
        if data_buffer:
            try:
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.executemany('''
                    INSERT INTO sensor_data (sensor_type, location, timestamp, value)
                    VALUES (?, ?, ?, ?)
                ''', data_buffer)
                conn.commit()
                conn.close()
                print(f"Final batch save: {len(data_buffer)} records written before shutdown.")
            except Exception as e:
                print(f"Error during shutdown save: {e}")

def main():
    """Main function to start the MQTT subscriber and batch writer."""
    init_db()
    print("MQTT Subscriber for Sensor Data Started")

    client = mqtt.Client(client_id=MQTT_CLIENT_ID)
    client.on_connect = on_connect
    client.on_message = on_message

    # Start batch writer thread
    batch_thread = threading.Thread(target=batch_write_to_db, daemon=True)
    batch_thread.start()

    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("Program stopped by user. Flushing remaining data...")
        graceful_shutdown()
        client.disconnect()
    except Exception as e:
        print(f"Unexpected error: {e}")
        client.disconnect()

if __name__ == "__main__":
    main()
