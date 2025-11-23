#include <WiFi.h>
#include "ThingSpeak.h"
#include <DHT.h>

// DHT11 sensor pin
#define DHT11_PIN 4

// WiFi credentials
const char* ssid = "0T41K1";
const char* password = "1122334455";

// ThingSpeak credentials
unsigned long myChannelNumber = 3;  
const char* myWriteAPIKey = "2XWNHFHNQALPHDIL";  

#define DHTTYPE DHT11
WiFiClient client;
DHT dht11(DHT11_PIN, DHTTYPE);

void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int retry_count = 0;
  const int max_retries = 20; // Maximum number of retries
  
  while (WiFi.status() != WL_CONNECTED && retry_count < max_retries) {
    delay(500);
    Serial.print(".");
    retry_count++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" connected");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" failed to connect");
    ESP.restart(); // Restart the ESP if WiFi connection fails
  }
}

void setup() {
  Serial.begin(115200);
  dht11.begin();
  connectToWiFi();
  ThingSpeak.begin(client);
}

void loop() {
  // Read DHT11 sensor
  float humi = dht11.readHumidity();
  float tempC = dht11.readTemperature();
  float tempF = dht11.readTemperature(true);

  // Check if readings are successful
  if (isnan(tempC) || isnan(tempF) || isnan(humi)) {
    Serial.println("Failed to read from DHT11 sensor!");
  } else {
    // Send data to ThingSpeak
    ThingSpeak.setField(1, tempC);
    ThingSpeak.setField(2, humi);
    int result = ThingSpeak.writeFields(myChannelNumber, myWriteAPIKey);
    
    if (result == 200) {
      Serial.println("Data sent to ThingSpeak successfully");
    } else {
      Serial.println("Failed to send data to ThingSpeak. Error code: " + String(result));
    }

    Serial.print("Humidity: ");
    Serial.print(humi);
    Serial.print("% | Temperature: ");
    Serial.print(tempC);
    Serial.print("°C ~ ");
    Serial.print(tempF);
    Serial.println("°F");
  }

  delay(2000); // Wait 2 seconds to avoid rate limits
}