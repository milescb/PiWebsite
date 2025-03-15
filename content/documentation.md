## Overview

Below, I document the deployment of this webpage. The code that hosts this site is located [on github](https://github.com/milescb/PiWebsite) and the whole website is hosted on a Raspberry Pi Zero 2w running [nginx](https://nginx.org/en/). 

Hardware

- Main computer: [Raspberry Pi Zero 2w](https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/)
- Temperature and Humidity Sensor: [DHT22](https://www.amazon.com/dp/B0CN5PN225?ref=ppx_yo2ov_dt_b_fed_asin_title)
- Microcontroller: [NodeMCU ESP8266](https://store-usa.arduino.cc/products/nodemcu-esp8266?srsltid=AfmBOoqXQniBXi6xgaQYNjxUDYrIKuJDMJ8GJLIlXFsOszKOACP5djWs)
- Capacitive moisture sensor: [v1.2](https://www.amazon.com/Stemedu-Capacitive-Corrosion-Resistant-Electronic/dp/B0BTHL6M19)

Software

- Raspbian lite OS (64bit)
- Website engine: [nginx](https://nginx.org)
- Message broker: [Mosquitto](https://mosquitto.org)
- Database: [SQLite](https://www.sqlite.org)

## Setup pi

Here are a few commands I run to get all the software I need on raspbian. First, make sure everything is up to date:

```bash
sudo apt update
sudo apt upgrade
```

Then, make ssh keys and configure git to use them:

```bash
sudo apt install git-all
ssh-keygen -t ed25519 -C “youremail@domain.com”
```

I like to use vim when not using vscode. Raspbian comes with a minimal version of vim, so we install the whole thing as well as [vimplug](https://github.com/junegunn/vim-plug): 

```bash
sudo apt install vim
curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
```

Finally, we install python dev tools, tmux, and tree:

```bash
sudo apt install python-dev-is-python3
sudo apt install tmux
sudo apt install tree
```

### Remote access with meshnet

First, install `nordvpn` and login:

```bash
sh <(curl -sSf https://downloads.nordcdn.com/apps/linux/install.sh)
sudo nordvpn login --token <your_token>
```

Then, enable meshnet via

```bash
sudo nordvpn set meshnet on
```

Note: this takes up a considerable amount of the pi's idle compute. By default, I have this set off and can decide to set on if I need access remotely. Alternatively, you can forward the ssh port (or please choose a non-default port) but this can open your pi up to attempted hacks. 

## Host Website

I use `nginx` to host the server. To use this, we first need to configure a few settings. 

### Configuring a Domain

I used [FreeDNS](https://freedns.afraid.org) to obtain a free domain name and subdomain for this website. To get this running, forward the http port (port 80), and the https port (port 443) on your home router. Then, obtain the IP address of your home router, and configure your selected subdomain with FreeDNS. You can then use this free url in the below configuration!

#### Warning!

Exposing ports on your home internet can expose your device to attacks. In order to mitgate these, ensure ssh is only enabled through ssh keys and do not forward port 22. Additionally, installing `fail2ban` and configuring a jail for the forwarded ports, as well as creating a firewall, for instance with `ufw`, provide additional security. 

### Configuring ssl

Install `certbot` to deal with obtaining an ssl certificate

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

Then, run `certbot`:

```bash
sudo certbot certonly --standalone -d <YOUR_URL>
```

To configure you website, open the file `/etc/nginx/sites-available/default` and replace the current content with the below code, changing `<YOUR_URL>` to the one selected above and `<WEBSITE_LOCAL_DIR_LOCATION>` to the local location you plan on hosting your site from. 

```
server {
    listen 80;
    listen [::]:80;

    server_name <YOUR_URL>;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    server_name <YOUR_URL>;

    ssl_certificate /etc/letsencrypt/live/<YOUR_URL>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<YOUR_URL>/privkey.pem;

    root <WEBSITE_LOCAL_DIR_LOCATION>;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Install Server

To install, first update the pi's software and remove apache2 (downloaded by default with raspbian)

```bash
sudo apt update
sudo apt upgrade
sudo apt remove apache2
```

Then, download `nginx`, start it, and enable so it's always started when booting up the pi

```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

Now you have a secure(ish) website! To propagate this with content, download the github repository linked above at `<WEBSITE_LOCAL_DIR_LOCATION>` and edit the enclosed `html`. 

## Interface with DHT22

Once you have your dht22 sensor, connect it to the GPIO pins of the pi

- Connect the positive lead to pin 1 (3.3V power)
- Connect the negative lead to pin 5 (ground)
- Connect the remaining data lead to pin 7 (GPIO 4)

You can then interface with the detector using the `adafruit_dht` python library as follows:

```python
import adafruit_dht 
import board

DHT_DEVICE = adafruit_dht.DHT22(board.D4)

try:
    temperature = DHT_DEVICE.temperature
    humidity = DHT_DEVICE.humidity
    print(f"Temp: {temperature:.1f}°C  Humidity: {humidity:.1f}%")
except RuntimeError as e:
    print(f"Reading from DHT22 failed: {e}")
finally:
    DHT_DEVICE.exit()
```

Now you can read off the local temperature and humidity!

## Interface with Moisture sensor

The capacitive moisture sensor linked above reads off an analogue signal which cannot be read on the pi without an analogue to digital converter. I will not detail this, and instead will simply describe how this is done with the interface to the nodemcu device. 

```c
#include <Arduino.h>

#define MOISTURE_PIN A0  // Analog pin for moisture sensor

void setup() {
    Serial.begin(115200);
}

void loop() {
    // Read temperature and humidity from DHT22
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    // Print soil moisture value
    Serial.print("Soil Moisture: ");
    Serial.println(moistureValue);

    delay(2000);  // Wait 2 seconds before next read
}
```

## Networking with Mosquitto

First, install the software:

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
```

Then, enable and start to start the process at boot:

```bash
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

Finally, test that everything is running with: `systemctl status mosquitto`. 

To start the MQTT server and send messages, run something like:

```python
import time
import paho.mqtt.client as mqtt

MQTT_BROKER = "localhost" 
MQTT_PORT = 1883
MQTT_TOPIC = "sensor/dht22"
MQTT_CLIENT_ID = "dht22_publisher"

client = mqtt.Client(client_id=MQTT_CLIENT_ID)

try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    while True:
        message = {"timestamp": "2025-03-14 17:30:58", 
                    "temperature": 64.8, "humidity": 73.7}
        result = client.publish(MQTT_TOPIC, message, qos=1)
        time.sleep(20)

except KeyboardInterrupt:
    print("Program stopped by user")
finally:
    client.loop_stop()
    client.disconnect()
```

and to recieve, all that is needed is a simple script:

```python
import json
import paho.mqtt.client as mqtt

MQTT_BROKER = "localhost" 
MQTT_PORT = 1883
MQTT_TOPIC = "sensor/test_dht22"
MQTT_CLIENT_ID = "test_dht22_subscriber"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Connected to MQTT broker at {MQTT_BROKER}")
        client.subscribe(MQTT_TOPIC, qos=1)
        print(f"Subscribed to topic: {MQTT_TOPIC}")
    else:
        print(f"Failed to connect to MQTT broker with code: {rc}")

def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8")
    reading = json.loads(payload)
    
    print(f"Received: Temp={reading['temperature']}°F, \
                Humidity={reading['humidity']}% at {reading['timestamp']}")

client = mqtt.Client(client_id=MQTT_CLIENT_ID)
client.on_connect = on_connect
client.on_message = on_message

try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()
    
except KeyboardInterrupt:
    print("Program stopped by user")
    client.disconnect()
```

## Database management

I use `SQLite` for database management. To install, run

```bash
sudo apt update
sudo apt install sqlite3
```
