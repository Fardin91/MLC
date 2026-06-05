#ifndef MATRIX_H
#define MATRIX_H

#include <Arduino.h>
#include "Adafruit_NeoPixel.h"

void matrixSetup();
void validateData(String rawData);
void runAnimation();

#endif