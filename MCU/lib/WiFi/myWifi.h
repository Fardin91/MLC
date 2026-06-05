#ifndef MY_WIFI_H
#define MY_WIFI_H
#include "Arduino.h"
#include "WiFi.h"

extern WiFiServer server;

void wifiSetup();
String receiveData(WiFiClient &client);
#endif
