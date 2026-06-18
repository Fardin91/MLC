#include <Arduino.h>
#include "matrix.h"
#include "myWifi.h"

void setup()
{
  // put your setup code here, to run once:
  wifiSetup();
  matrixSetup();
}

void loop()
{
  // put your main code here, to run repeatedly:
  WiFiClient client = server.available();
  validateData(receiveData(client));

  runAnimation();

  delay(1);
}
