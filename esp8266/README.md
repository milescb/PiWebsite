# ESP8266 Setup

To obtain the code to configure your code with `Arduino`, install the [Arduino IDE](https://www.arduino.cc/en/software/) and copy `PlantMonitor` to `Arduino/Libraries` (often located in your `Documents` folder). 

In future iterations this will be a registered package you can install through the `ArduinoIDE` interface directly. 

## Requirements

### Hardware

- ESP8266 dev board
- CD4051BE multiplexer
- Breadboard / jumper cables etc.

### Software

- Arduino IDE
- ESP8266 board software and drivers

## Wiring the device

### ESP8266 to DHT Sensor

| ESP8266 Pin | DHT Pin | Description |
|-------------|---------|-------------|
| D4          | Out     | Data signal |
| G           | -       | Ground      |
| 3.3V        | +       | Power       |

### ESP8266 to CD4051BE Multiplexer

| ESP8266 Pin | CD4051BE Pin | Description        |
|-------------|--------------|-------------------|
| D0          | S0 (A)       | Address bit A     |
| D1          | S1 (B)       | Address bit B     |
| D2          | S2 (C)       | Address bit C     |
| A0          | Common       | Analog input      |
| 3.3V        | VCC          | Power             |
| G           | GND          | Ground            |
| G           | Inhibit      | Disable (tie low) |
| G           | VEE          | Negative supply   |  

Connect the capacitive moisture sensors to any of the I/O channels of the multiplexer as well as ground and 3.3v as appropriate. 

## Configuration

In ArduinoIDE, modify something like the below script to your specifications:

```cpp
#include <PlantMonitor.h>

PlantMonitor monitor("YourSSID", "YourPassword", 
                    "10.0.0.32", 1883, // MQTT IP and port 
                    "esp8266_bookshelf" // MQTT device name
                );

void setup() {
    Serial.begin(115200);

    // Optionally setup the DHT device for temperature and moisture readings
    monitor.beginDHT(D4, DHT22);
    // Configure MQTT topics for temperature and humidity (optional - defaults shown)
    monitor.setTemperatureTopic("sensor/temperature/bookshelf");
    monitor.setHumidityTopic("sensor/humidity/bookshelf");
    
    // Setup the multiplexer to read analogue signals from moisture sensors.
    // The first three inputs are the digital pins connecting to the multiplexer chip
    // while the last is the analogue pin. 
    monitor.beginMux(D0, D1, D2, A0);

    // add up to eight plants. The configuration takes the form:
    //  {"name", MUX_VALUE, MAX_DRY_READING, MAX_WET_READING, MQTT_NAME}
    monitor.addPlant({"prayer", 0, 712, 345, "sensor/moisture/prayer"});
    monitor.addPlant({"begonia", 1, 725, 355, "sensor/moisture/begonia"});
    monitor.addPlant({"myrtle", 2, 721, 360, "sensor/moisture/myrtle"});
    monitor.addPlant({"pinkprayer", 3, 724, 340, "sensor/moisture/pinkprayer"});
    monitor.addPlant({"kissbegonia", 4, 715, 330, "sensor/moisture/kissbegonia"});
    monitor.addPlant({"nerve", 6, 723, 0, "sensor/moisture/nerve"});

    monitor.connect();
}

void loop() {
    monitor.loop();
    monitor.readAndPublish();
    delay(60000);
}
```


For calibrating the max dry and wet readings, take a few measurements with the sensor in air and with water and mark these down. 