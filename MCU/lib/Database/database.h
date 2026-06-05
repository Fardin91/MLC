#ifndef DATABASE_H
#define DATABASE_H

#include <Arduino.h>
#include <WiFi.h>

namespace matrixdb
{
    constexpr int MATRIX_PIXELS = 256;
    constexpr int MAX_FRAMES = 15;
    constexpr int MAX_PIXEL_TRIPLES = MATRIX_PIXELS * MAX_FRAMES;

    struct AnimationData
    {
        int frameCount = 0;
        bool reverseAnimation = false;
        int loadedPixelTriples = 0;
        uint8_t pixels[MAX_PIXEL_TRIPLES][3] = {0};
    };

    bool fetchAnimationById(int animationId, const char *host, uint16_t port, AnimationData &outData);
}

#endif
