#!/usr/bin/env python3
import time
import argparse
import json
import os
import sqlite3
from datetime import datetime
import adafruit_dht
import board

from database.sqdatabase import setup_database, save_to_sqlite
from database.dht22 import read_sensor

# Configuration
DHT_DEVICE = adafruit_dht.DHT22(board.D4)
DATA_DIR = "data"
DB_FILE = os.path.join(DATA_DIR, "sensor_data.db")
LOG_INTERVAL = 300  # log every five mins

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def main():
    """Main function to read sensor and save data at regular intervals."""
    print("DHT22 Sensor Logger Started (SQLite Version)")
    print(f"Database path: {os.path.abspath(DB_FILE)}")
    print(f"Reading every {LOG_INTERVAL} seconds")
    
    if not setup_database(DB_FILE):
        print("Failed to initialize database. Exiting.")
        return
    
    while True:
        reading = read_sensor(DHT_DEVICE)
        if reading:
            success = save_to_sqlite(reading, DB_FILE)
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