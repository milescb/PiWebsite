#!/usr/bin/env python3
import time
import json
from datetime import datetime
import adafruit_dht
import board
import paho.mqtt.client as mqtt

DHT_DEVICE = adafruit_dht.DHT22(board.D4)
LOG_INTERVAL = 300  # log every five mins

MQTT_BROKER = "localhost" 
MQTT_PORT = 1883
MQTT_TOPIC = "sensor/dht22"
MQTT_CLIENT_ID = "dht22_publisher"

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
    """Publish reading to MQTT broker."""
    try:

        message = json.dumps(reading)
        result = client.publish(MQTT_TOPIC, message, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(f"Published: Temp={reading['temperature']}°F, Humidity={reading['humidity']}%")
            return True
        else:
            print(f"Failed to publish message: {result}")
            return False
    except Exception as e:
        print(f"Error publishing data: {e}")
        return False

def on_connect(client, userdata, flags, rc):
    """Callback for when the client receives a CONNACK response from the server."""
    if rc == 0:
        print("Connected to MQTT broker")
    else:
        print(f"Failed to connect to MQTT broker with code: {rc}")

def main():
    """Main function to read sensor and publish data at regular intervals."""
    print("DHT22 Sensor MQTT Publisher Started")
    print(f"Publishing to {MQTT_TOPIC} every {LOG_INTERVAL} seconds")
    
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