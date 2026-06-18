#include "database.h"
#include <WiFiClientSecure.h>
#include <cstring>

namespace
{
    int extractIntField(const String &jsonObject, const char *fieldName, int fallbackValue)
    {
        String key = "\"";
        key += fieldName;
        key += "\":";
        int start = jsonObject.indexOf(key);
        if (start < 0)
        {
            return fallbackValue;
        }

        start += key.length();
        while (start < jsonObject.length() && (jsonObject[start] == ' ' || jsonObject[start] == '\"'))
        {
            start++;
        }

        int end = start;
        while (end < jsonObject.length() && (jsonObject[end] == '-' || isDigit(jsonObject[end])))
        {
            end++;
        }

        if (end <= start)
        {
            return fallbackValue;
        }

        return jsonObject.substring(start, end).toInt();
    }

    bool extractBoolField(const String &jsonObject, const char *fieldName, bool fallbackValue)
    {
        String key = "\"";
        key += fieldName;
        key += "\":";
        int start = jsonObject.indexOf(key);
        if (start < 0)
        {
            return fallbackValue;
        }

        start += key.length();
        while (start < jsonObject.length() && jsonObject[start] == ' ')
        {
            start++;
        }

        if (jsonObject.startsWith("true", start))
        {
            return true;
        }

        if (jsonObject.startsWith("false", start))
        {
            return false;
        }

        return jsonObject[start] == '1';
    }

    int parsePixelTriples(const String &pixelsArray, uint8_t output[matrixdb::MAX_PIXEL_TRIPLES][3])
    {
        int values[3] = {0, 0, 0};
        int valueIndex = 0;
        int tripleCount = 0;
        String token = "";

        for (unsigned int i = 0; i < pixelsArray.length(); i++)
        {
            char c = pixelsArray[i];
            if (c == '-' || isDigit(c))
            {
                token += c;
                continue;
            }

            if (token.length() == 0)
            {
                continue;
            }

            values[valueIndex++] = token.toInt(); // String to int conversion of RGB values
            token = "";

            if (valueIndex == 3)
            {
                if (tripleCount >= matrixdb::MAX_PIXEL_TRIPLES)
                {
                    break;
                }

                for (int ch = 0; ch < 3; ch++)
                {
                    int clamped = constrain(values[ch], 0, 255);
                    output[tripleCount][ch] = static_cast<uint8_t>(clamped);
                }

                tripleCount++;
                valueIndex = 0;
            }
        }

        return tripleCount;
    }
}

bool matrixdb::fetchAnimationById(int animationId, const char *host, uint16_t port, bool secure, AnimationData &outData)
{
    outData.frameCount = 0;
    outData.reverseAnimation = false;
    outData.loadedPixelTriples = 0;
    memset(outData.pixels, 0, sizeof(outData.pixels));

    if (secure)
    {
        WiFiClientSecure client;
        client.setInsecure();
        if (!client.connect(host, port))
        {
            return false;
        }

        // Send HTTP GET request for the animation with the specified ID
        client.print("GET /animations/");
        client.print(animationId);
        client.println(" HTTP/1.1");
        client.print("Host: ");
        client.println(host);
        client.println("Connection: close");
        client.println();

        client.setTimeout(1500);

        String statusLine = client.readStringUntil('\n');
        statusLine.trim();
        if (!statusLine.startsWith("HTTP/1.1 200"))
        {
            client.stop();
            return false;
        }

        int contentLength = -1;
        while (client.connected())
        {
            String headerLine = client.readStringUntil('\n');
            headerLine.trim();
            if (headerLine.length() == 0)
            {
                break;
            }

            if (headerLine.startsWith("Content-Length:"))
            {
                contentLength = headerLine.substring(String("Content-Length:").length()).toInt();
            }
        }

        String animationObj = "";
        if (contentLength > 0 && contentLength < 65536)
        {
            animationObj.reserve(contentLength + 8);
        }

        // read db response
        uint32_t readStart = millis();
        while (client.connected() || client.available())
        {
            while (client.available())
            {
                animationObj += static_cast<char>(client.read());
            }

            if (contentLength > 0 && animationObj.length() >= static_cast<unsigned int>(contentLength))
            {
                break;
            }

            if (millis() - readStart > 3000)
            {
                break;
            }

            delay(1);
            yield();
        }
        client.stop();

        if (animationObj.indexOf("\"id\":") < 0)
        {
            return false;
        }

        outData.frameCount = extractIntField(animationObj, "frameCount", 1);
        if (outData.frameCount < 1)
        {
            outData.frameCount = 1;
        }
        if (outData.frameCount > matrixdb::MAX_FRAMES)
        {
            outData.frameCount = matrixdb::MAX_FRAMES;
        }

        // extract pixel triples
        outData.reverseAnimation = extractBoolField(animationObj, "reverseAnimation", false);

        int pixelsFieldPos = animationObj.indexOf("\"pixels\":");
        if (pixelsFieldPos < 0)
        {
            return false;
        }

        int pixelsArrayStart = animationObj.indexOf('[', pixelsFieldPos);
        int pixelsArrayEnd = animationObj.lastIndexOf(']');
        if (pixelsArrayStart < 0 || pixelsArrayEnd < 0 || pixelsArrayEnd <= pixelsArrayStart)
        {
            return false;
        }

        String pixelsPayload = animationObj.substring(pixelsArrayStart, pixelsArrayEnd + 1);
        outData.loadedPixelTriples = parsePixelTriples(pixelsPayload, outData.pixels);

        return outData.loadedPixelTriples > 0;
    }
    else
    {
        WiFiClient client;
        if (!client.connect(host, port))
        {
            return false;
        }

        // Send HTTP GET request for the animation with the specified ID
        client.print("GET /animations/");
        client.print(animationId);
        client.println(" HTTP/1.1");
        client.print("Host: ");
        client.println(host);
        client.println("Connection: close");
        client.println();

        client.setTimeout(1500);

        String statusLine = client.readStringUntil('\n');
        statusLine.trim();
        if (!statusLine.startsWith("HTTP/1.1 200"))
        {
            client.stop();
            return false;
        }

        int contentLength = -1;
        while (client.connected())
        {
            String headerLine = client.readStringUntil('\n');
            headerLine.trim();
            if (headerLine.length() == 0)
            {
                break;
            }

            if (headerLine.startsWith("Content-Length:"))
            {
                contentLength = headerLine.substring(String("Content-Length:").length()).toInt();
            }
        }

        String animationObj = "";
        if (contentLength > 0 && contentLength < 65536)
        {
            animationObj.reserve(contentLength + 8);
        }

        // read db response
        uint32_t readStart = millis();
        while (client.connected() || client.available())
        {
            while (client.available())
            {
                animationObj += static_cast<char>(client.read());
            }

            if (contentLength > 0 && animationObj.length() >= static_cast<unsigned int>(contentLength))
            {
                break;
            }

            if (millis() - readStart > 3000)
            {
                break;
            }

            delay(1);
            yield();
        }
        client.stop();

        if (animationObj.indexOf("\"id\":") < 0)
        {
            return false;
        }

        outData.frameCount = extractIntField(animationObj, "frameCount", 1);
        if (outData.frameCount < 1)
        {
            outData.frameCount = 1;
        }
        if (outData.frameCount > matrixdb::MAX_FRAMES)
        {
            outData.frameCount = matrixdb::MAX_FRAMES;
        }

        // extract pixel triples
        outData.reverseAnimation = extractBoolField(animationObj, "reverseAnimation", false);

        int pixelsFieldPos = animationObj.indexOf("\"pixels\":");
        if (pixelsFieldPos < 0)
        {
            return false;
        }

        int pixelsArrayStart = animationObj.indexOf('[', pixelsFieldPos);
        int pixelsArrayEnd = animationObj.lastIndexOf(']');
        if (pixelsArrayStart < 0 || pixelsArrayEnd < 0 || pixelsArrayEnd <= pixelsArrayStart)
        {
            return false;
        }

        String pixelsPayload = animationObj.substring(pixelsArrayStart, pixelsArrayEnd + 1);
        outData.loadedPixelTriples = parsePixelTriples(pixelsPayload, outData.pixels);

        return outData.loadedPixelTriples > 0;
    }
}
