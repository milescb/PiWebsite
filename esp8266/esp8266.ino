#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <time.h>

// WiFi Credentials
const char* SSID = "<wifi_name>";
const char* PASSWORD = "<your_password>";

// MQTT Broker
const char* MQTT_BROKER = "10.0.0.32";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "esp8266_bedroom";

// MQTT Topics
const char* TEMP_TOPIC = "sensor/temperature/bedroom";
const char* HUMIDITY_TOPIC = "sensor/humidity/bedroom";
const char* MOISTURE_TOPIC = "sensor/moisture/snake_plant";

// DHT22 Setup
#define DHTPIN D4  // GPIO2
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Moisture Sensor
#define MOISTURE_PIN A0  // Analog pin

// wait interval for moisture readings
int currentInterval = 0;

// WiFi & MQTT Clients
WiFiClient espClient;
PubSubClient client(espClient);

float celcius_to_fahrenheit(float temp)
{
    return temp * (9.0 / 5.0) + 32.0;
}

void setup() 
{
    Serial.begin(115200);
    
    // Connect to WiFi
    WiFi.begin(SSID, PASSWORD);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) 
    {
        delay(1000);
        Serial.print(".");
    }
    Serial.println("\nWiFi Connected!");

    // Setup MQTT
    client.setServer(MQTT_BROKER, MQTT_PORT);
    
    dht.begin();

    // Initialize time
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void reconnect() {
    while (!client.connected()) 
    {
        Serial.print("Attempting MQTT connection...");
        if (client.connect(MQTT_CLIENT_ID)) 
        {
            Serial.println("Connected to MQTT broker!");
        } 
        else 
        {
            Serial.print("Failed, rc=");
            Serial.print(client.state());
            Serial.println(" Retrying in 5 seconds...");
            delay(5000);
        }
    }
}

void publishData(const char* topic, float value, const char* unit) 
{
    time_t now = time(nullptr);
    char timestamp[20];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));

    char msg[100];
    snprintf(msg, sizeof(msg), "{\"timestamp\": \"%s\", \"value\": %.2f, \"unit\": \"%s\"}", timestamp, value, unit);
    client.publish(topic, msg);
    Serial.print("Published to ");
    Serial.print(topic);
    Serial.print(": ");
    Serial.println(msg);
}

void loop() {
    if (!client.connected()) 
    {
        reconnect();
    }
    client.loop();

    // Read DHT22 data
    float temperature = dht.readTemperature();  // Celsius
    float humidity = dht.readHumidity();

    if (!isnan(temperature) && !isnan(humidity)) 
    {
        temperature = celcius_to_fahrenheit(temperature);
        publishData(TEMP_TOPIC, temperature, "°F");
        publishData(HUMIDITY_TOPIC, humidity, "%");
    } 
    else 
    {
        Serial.println("Failed to read from DHT22 sensor!");
    }

    // wait 1 hour before reading moisture sensor
    if (currentInterval % 12 == 0)
    {
        // Read moisture level (scale from 0 to 100)
        int rawMoisture = analogRead(MOISTURE_PIN);
        float moisture = map(rawMoisture, 626, 317, 0, 100);  // Adjust if needed
        moisture = constrain(moisture, 0, 100);
        
        publishData(MOISTURE_TOPIC, moisture, "%");
        
        currentInterval = 0;
    }
    currentInterval++;

    // Wait before next read
    delay(300000);  // 5 minutes
}
