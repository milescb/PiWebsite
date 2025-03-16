#!/usr/bin/env python3
import time
import json
from datetime import datetime
import adafruit_dht
import board
import paho.mqtt.client as mqtt

DHT_DEVICE = adafruit_dht.DHT22(board.D4)
LOG_INTERVAL = 420  # log every seven mins
MQTT_BROKER = "10.0.0.32"
MQTT_PORT = 1883
MQTT_CLIENT_ID = "dht22_publisher"

# Updated to use specific topics for temperature and humidity
MQTT_TOPICS = [
    ("sensor/temperature/livingroom", 1),
    ("sensor/humidity/livingroom", 1),
]

def celcius_to_fahrenheit(temp_celcius):
    temp_fahrenheit = temp_celcius * (9./5.) + 32
    return temp_fahrenheit

def read_sensor(max_attempts=5):
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
        attempt += 1
        time.sleep(2)
    print("Failed to get valid reading after multiple attempts")
    return None

def publish_data(client, reading):
    """Publish temperature and humidity to separate MQTT topics."""
    try:
        timestamp = reading["timestamp"]
        
        # Publish temperature
        temp_message = json.dumps({
            "timestamp": timestamp,
            "value": reading["temperature"],
            "unit": "°F"
        })
        temp_result = client.publish(MQTT_TOPICS[0][0], temp_message, qos=MQTT_TOPICS[0][1])
        
        # Publish humidity
        humidity_message = json.dumps({
            "timestamp": timestamp,
            "value": reading["humidity"],
            "unit": "%"
        })
        humidity_result = client.publish(MQTT_TOPICS[1][0], humidity_message, qos=MQTT_TOPICS[1][1])
        
        if temp_result.rc == mqtt.MQTT_ERR_SUCCESS and humidity_result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(f"Published: Temp={reading['temperature']}°F to {MQTT_TOPICS[0][0]}, "
                  f"Humidity={reading['humidity']}% to {MQTT_TOPICS[1][0]}")
            return True
        else:
            print(f"Failed to publish messages: Temp={temp_result.rc}, Humidity={humidity_result.rc}")
            return False
    except Exception as e:
        print(f"Error publishing data: {e}")
        return False

def on_connect(client, userdata, flags, rc):
    """Callback for when the client receives a CONNACK response from the server."""
    if rc == 0:
        print("Connected to MQTT broker")
        print(f"Publishing to topics: {[topic[0] for topic in MQTT_TOPICS]}")
    else:
        print(f"Failed to connect to MQTT broker with code: {rc}")

def main():
    """Main function to read sensor and publish data at regular intervals."""
    print("DHT22 Sensor MQTT Publisher Started")
    print(f"Publishing readings every {LOG_INTERVAL} seconds")
    
    client = mqtt.Client(client_id=MQTT_CLIENT_ID)
    client.on_connect = on_connect
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        
        while True:
            reading = read_sensor()
            if reading:
                publish_data(client, reading)
            time.sleep(LOG_INTERVAL)
    except KeyboardInterrupt:
        print("Program stopped by user")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
