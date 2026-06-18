#include "matrix.h"
#include <Preferences.h>
#include <cstring>
#include "database.h"

#ifndef DB_SERVER_HOST
#define DB_SERVER_HOST "10.153.250.2"
#endif

#ifndef DB_SERVER_PORT
#define DB_SERVER_PORT 3000
#endif

namespace
{
    constexpr uint8_t MATRIX_DATA_PIN = 13;
    uint16_t dbServerPort = DB_SERVER_PORT;
    bool dbServerSecure = false;
    constexpr size_t DB_HOST_MAX_LEN = 63;

    Adafruit_NeoPixel matrix(256, MATRIX_DATA_PIN, NEO_GRB + NEO_KHZ800);
    Preferences matrixPrefs;

    char dbServerHost[DB_HOST_MAX_LEN + 1] = DB_SERVER_HOST;

    bool isPlayingAnimation = false;
    int currentFrame = 0;
    uint32_t lastFrameTime = 0;
    int frameInterval = 50;
    int frameStepDirection = 1;

    matrixdb::AnimationData animationData;

    void printDivider()
    {
        Serial.println("==================================================");
    }

    void logCommand(const char cmd, const String &value)
    {
        Serial.print("CMD:");
        Serial.print(cmd);
        Serial.print(" VAL:");
        Serial.println(value);
    }

    bool looksLikeHost(const String &candidate)
    {
        if (candidate.length() == 0)
            return false;

        // Accept IPv4, hostnames, or IP:port / host:port forms (no protocol)
        // Reject strings containing spaces or slashes
        for (unsigned int i = 0; i < candidate.length(); i++)
        {
            char c = candidate[i];
            if (c == ' ' || c == '\t' || c == '\n' || c == '/')
                return false;
        }

        // simple check: allow digits, letters, dot, hyphen, and colon (for port)
        for (unsigned int i = 0; i < candidate.length(); i++)
        {
            char c = candidate[i];
            if (!(isDigit(c) || isAlpha(c) || c == '.' || c == '-' || c == ':'))
            {
                return false;
            }
        }

        return true;
    }

    void updateDbHost(const String &newHostRaw)
    {
        String newHost = newHostRaw;
        newHost.trim();

        // detect protocol (remember if secure) then strip
        bool secure = false;
        if (newHost.startsWith("http://") || newHost.startsWith("https://"))
        {
            if (newHost.startsWith("https://"))
            {
                secure = true;
            }
            int idx = newHost.indexOf("//");
            if (idx >= 0)
            {
                newHost = newHost.substring(idx + 2);
            }
        }

        // strip any trailing path
        int slashPos = newHost.indexOf('/');
        if (slashPos >= 0)
        {
            newHost = newHost.substring(0, slashPos);
        }

        newHost.trim();
        if (newHost.length() == 0 || newHost.length() > DB_HOST_MAX_LEN)
            return;

        // parse optional :port
        String hostPart = newHost;
        uint16_t portPart = dbServerPort;
        bool explicitPort = false;
        int colonPos = newHost.lastIndexOf(':');
        if (colonPos > 0)
        {
            String maybePort = newHost.substring(colonPos + 1);
            bool allDigits = true;
            for (unsigned int i = 0; i < maybePort.length(); i++)
            {
                if (!isDigit(maybePort[i]))
                {
                    allDigits = false;
                    break;
                }
            }

            if (allDigits && maybePort.length() > 0)
            {
                portPart = static_cast<uint16_t>(maybePort.toInt());
                hostPart = newHost.substring(0, colonPos);
                explicitPort = true;
            }
        }

        if (secure && !explicitPort)
        {
            portPart = 443;
        }

        if (!looksLikeHost(hostPart))
            return;

        hostPart.toCharArray(dbServerHost, DB_HOST_MAX_LEN + 1);
        dbServerPort = portPart;
        dbServerSecure = secure || (dbServerPort == 443);
        matrixPrefs.putString("dbHost", String(dbServerHost));
        matrixPrefs.putUInt("dbPort", dbServerPort);
        matrixPrefs.putBool("dbSecure", dbServerSecure);
    }

    int parsePayloadValues(const String &payload, int values[], int maxValues)
    {
        int count = 0;
        String token = "";

        for (unsigned int i = 1; i < payload.length(); i++)
        {
            char c = payload[i];
            if (c == '|')
            {
                if (token.length() > 0 && count < maxValues)
                {
                    values[count++] = token.toInt();
                }
                token = "";
            }
            else
            {
                token += c;
            }
        }

        if (token.length() > 0 && count < maxValues)
        {
            values[count++] = token.toInt();
        }

        return count;
    }

    int mapVirtualToPhysical(int virtualIndex)
    {
        int row = virtualIndex / 16;
        int col = virtualIndex % 16;

        if (row < 8)
        {
            if (col < 8)
            {
                return row * 8 + col;
            }
            return 192 + row * 8 + (col - 8);
        }

        if (col < 8)
        {
            return 64 + (row - 8) * 8 + col;
        }
        return 128 + (row - 8) * 8 + (col - 8);
    }

    bool loadAnimation(int animationId)
    {
        currentFrame = 0;
        frameStepDirection = 1;
        animationData.frameCount = 0;
        animationData.reverseAnimation = false;
        animationData.loadedPixelTriples = 0;
        memset(animationData.pixels, 0, sizeof(animationData.pixels));

        return matrixdb::fetchAnimationById(animationId, dbServerHost, dbServerPort, dbServerSecure, animationData);
    }
}

void matrixSetup()
{
    matrixPrefs.begin("matrix", false);
    String persistedHost = matrixPrefs.getString("dbHost", "");
    persistedHost.trim();
    if (persistedHost.length() > 0 && persistedHost.length() <= DB_HOST_MAX_LEN)
    {
        persistedHost.toCharArray(dbServerHost, DB_HOST_MAX_LEN + 1);
    }
    // restore persisted port if present
    uint32_t persistedPort = matrixPrefs.getUInt("dbPort", dbServerPort);
    if (persistedPort > 0 && persistedPort <= 65535)
    {
        dbServerPort = static_cast<uint16_t>(persistedPort);
    }
    // restore persisted secure flag
    dbServerSecure = matrixPrefs.getBool("dbSecure", dbServerSecure);

    matrix.begin();
    matrix.show();

    printDivider();
    Serial.println("MATRIX ENGINE: READY");
    Serial.print("Active animation DB host: ");
    Serial.print(dbServerHost);
    Serial.print(":");
    Serial.print(dbServerPort);
    Serial.print(dbServerSecure ? " (HTTPS)" : " (HTTP)");
    Serial.println();
    printDivider();
}

void validateData(String rawData)
{
    if (rawData.length() == 0)
    {
        return;
    }

    char cmd = rawData[0];
    int values[4] = {0, 0, 0, 0};
    int count = parsePayloadValues(rawData, values, 4);

    if (cmd == 'P')
    {
        logCommand('P', String(values[0]));
        isPlayingAnimation = false;
        if (loadAnimation(values[0]))
        {
            isPlayingAnimation = true;
            currentFrame = 0;
            frameStepDirection = 1;
            lastFrameTime = 0;
        }
        return;
    }

    if (cmd == 'H')
    {
        logCommand('H', "HALT");
        isPlayingAnimation = false;
        matrix.clear();
        matrix.show();
        return;
    }

    if (cmd == 'S')
    {
        int separatorIndex = rawData.indexOf('|');
        if (separatorIndex >= 0 && separatorIndex + 1 < rawData.length())
        {
            String host = rawData.substring(separatorIndex + 1);
            logCommand('S', host);
            updateDbHost(host);
        }
        return;
    }

    if (cmd == 'D' && count >= 4)
    {
        int physicalIndex = mapVirtualToPhysical(values[0]);
        matrix.setPixelColor(physicalIndex, values[1], values[2], values[3]);
        matrix.show();
        logCommand('D', String(values[0]) + "," + String(values[1]) + "," + String(values[2]) + "," + String(values[3]));
        return;
    }

    if (cmd == 'F' && count >= 3)
    {
        matrix.fill(matrix.Color(values[0], values[1], values[2]));
        matrix.show();
        logCommand('F', String(values[0]) + "," + String(values[1]) + "," + String(values[2]));
        return;
    }

    if (cmd == 'B' && count >= 1)
    {
        matrix.setBrightness(values[0]);
        matrix.show();
        logCommand('B', String(values[0]));
        return;
    }

    if (cmd == 'I' && count >= 1)
    {
        frameInterval = values[0] * 10;
        logCommand('I', String(frameInterval));
    }
}

void runAnimation()
{
    if (!isPlayingAnimation)
    {
        return;
    }

    if (animationData.frameCount <= 0 || animationData.loadedPixelTriples <= 0)
    {
        return;
    }

    uint32_t now = millis();
    if (now - lastFrameTime < static_cast<uint32_t>(frameInterval))
    {
        return;
    }
    lastFrameTime = now;

    int frameStart = currentFrame * matrixdb::MATRIX_PIXELS;
    if (frameStart < 0 || frameStart >= animationData.loadedPixelTriples)
    {
        frameStart = 0;
        currentFrame = 0;
    }

    for (int virtualIndex = 0; virtualIndex < matrixdb::MATRIX_PIXELS; virtualIndex++)
    {
        int srcIndex = frameStart + virtualIndex;
        uint8_t r = 0;
        uint8_t g = 0;
        uint8_t b = 0;

        if (srcIndex < animationData.loadedPixelTriples)
        {
            r = animationData.pixels[srcIndex][0];
            g = animationData.pixels[srcIndex][1];
            b = animationData.pixels[srcIndex][2];
        }

        int physicalIndex = mapVirtualToPhysical(virtualIndex);
        matrix.setPixelColor(physicalIndex, r, g, b);
    }

    matrix.show();

    if (animationData.reverseAnimation && animationData.frameCount > 1)
    {
        currentFrame += frameStepDirection;
        if (currentFrame >= animationData.frameCount - 1)
        {
            currentFrame = animationData.frameCount - 1;
            frameStepDirection = -1;
        }
        else if (currentFrame <= 0)
        {
            currentFrame = 0;
            frameStepDirection = 1;
        }
        return;
    }

    currentFrame = (currentFrame + 1) % animationData.frameCount;
}
