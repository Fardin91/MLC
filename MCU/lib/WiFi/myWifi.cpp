#include "myWifi.h"

const char *ssid = "*";
const char *password = "*";
WiFiServer server(80);

namespace
{
    void printDivider()
    {
        Serial.println("--------------------------------------------------");
    }

    String decodeUrlComponent(const String &value)
    {
        String decoded = "";

        for (int i = 0; i < value.length(); i++)
        {
            if (value[i] == '%' && i + 2 < value.length())
            {
                String hex = value.substring(i + 1, i + 3);
                decoded += static_cast<char>(strtol(hex.c_str(), nullptr, 16));
                i += 2;
            }
            else if (value[i] == '+')
            {
                decoded += ' ';
            }
            else
            {
                decoded += value[i];
            }
        }

        return decoded;
    }

    String getQueryParam(const String &query, const String &name)
    {
        String key = name + "=";
        int start = query.indexOf(key);

        if (start == -1)
        {
            return "";
        }

        start += key.length();
        int end = query.indexOf('&', start);

        if (end == -1)
        {
            end = query.length();
        }

        return decodeUrlComponent(query.substring(start, end));
    }

    String buildStructuredPayload(const String &query)
    {
        String command = getQueryParam(query, "cmd");

        if (command.length() != 1)
        {
            return "";
        }

        char cmd = command[0];

        if (cmd == 'B' || cmd == 'I')
        {
            int value = getQueryParam(query, "value").toInt();
            String payload = "";
            payload += cmd;
            payload += '|';
            payload += String(value);
            return payload;
        }

        if (cmd == 'P')
        {
            String idParam = getQueryParam(query, "id");
            if (idParam.length() == 0)
            {
                idParam = getQueryParam(query, "value");
            }

            int animationId = idParam.toInt();
            if (animationId <= 0)
            {
                animationId = 1;
            }

            String payload = "";
            payload += cmd;
            payload += '|';
            payload += String(animationId);
            return payload;
        }

        if (cmd == 'H')
        {
            String payload = "";
            payload += cmd;
            return payload;
        }

        if (cmd == 'D')
        {
            int pixel = getQueryParam(query, "pixel").toInt();
            int r = getQueryParam(query, "r").toInt();
            int g = getQueryParam(query, "g").toInt();
            int b = getQueryParam(query, "b").toInt();

            String payload = "";
            payload += cmd;
            payload += '|';
            payload += String(pixel);
            payload += '|';
            payload += String(r);
            payload += '|';
            payload += String(g);
            payload += '|';
            payload += String(b);
            return payload;
        }

        if (cmd == 'F')
        {
            int r = getQueryParam(query, "r").toInt();
            int g = getQueryParam(query, "g").toInt();
            int b = getQueryParam(query, "b").toInt();

            String payload = "";
            payload += cmd;
            payload += '|';
            payload += String(r);
            payload += '|';
            payload += String(g);
            payload += '|';
            payload += String(b);
            return payload;
        }

        if (cmd == 'S')
        {
            String host = getQueryParam(query, "host");
            if (host.length() == 0)
            {
                host = getQueryParam(query, "value");
            }

            host.trim();
            if (host.length() == 0)
            {
                return "";
            }

            String payload = "";
            payload += cmd;
            payload += '|';
            payload += host;
            return payload;
        }

        return "";
    }

    void sendHttpResponse(WiFiClient &client, int statusCode, const char *statusText, const char *contentType, const String &body)
    {
        client.print("HTTP/1.1 ");
        client.print(statusCode);
        client.print(" ");
        client.println(statusText);
        client.println("Access-Control-Allow-Origin: *");
        client.println("Connection: close");
        client.print("Content-Type: ");
        client.println(contentType);
        client.print("Content-Length: ");
        client.println(body.length());
        client.println();
        client.print(body);
    }
} // namespace

void wifiSetup()
{
    Serial.begin(115200);
    delay(100);

    printDivider();
    Serial.println("SYSTEM BOOT: WiFi setup started");
    Serial.print("Target WiFi: ");
    Serial.println(ssid);

    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        yield();
        Serial.print(".");
    }

    Serial.println("");
    Serial.println("WiFi status: CONNECTED");
    Serial.print("ESP32 IP address: ");
    Serial.println(WiFi.localIP());

    server.begin();
    Serial.println("Web command server: READY");
    printDivider();
}

String receiveData(WiFiClient &client)
{
    if (!client || !client.connected())
    {
        return "";
    }

    uint32_t waitStart = millis();
    while (client.connected() && !client.available() && (millis() - waitStart < 200))
    {
        delay(1);
        yield();
    }

    if (!client.available())
    {
        client.stop();
        return "";
    }

    client.setTimeout(100);
    String requestLine = client.readStringUntil('\r');

    while (client.connected() && client.available())
    {
        String headerLine = client.readStringUntil('\n');
        if (headerLine == "\r" || headerLine.length() == 0)
        {
            break;
        }

        yield();
    }

    if (requestLine.startsWith("GET /status"))
    {
        sendHttpResponse(client, 200, "OK", "application/json", "{\"status\":\"ok\"}");
        client.stop();
        return "";
    }

    if (!requestLine.startsWith("GET /data?"))
    {
        sendHttpResponse(client, 404, "Not Found", "text/plain", "Not Found");
        client.stop();
        return "";
    }

    int queryStart = requestLine.indexOf("/data?");
    if (queryStart != -1)
    {
        queryStart += 6;
        int queryEnd = requestLine.indexOf(' ', queryStart);

        if (queryEnd == -1)
        {
            queryEnd = requestLine.length();
        }

        String query = requestLine.substring(queryStart, queryEnd);
        String value = getQueryParam(query, "val");

        if (value.length() > 0)
        {
            if (value.length() == 7 && value[0] == '[' && value[6] == ']')
            {
                String payload = value.substring(1, 6);
                sendHttpResponse(client, 200, "OK", "text/plain", "OK");
                client.stop();
                return payload;
            }
        }

        String payload = buildStructuredPayload(query);

        if (payload.length() > 0)
        {
            sendHttpResponse(client, 200, "OK", "text/plain", "OK");
            client.stop();
            return payload;
        }
    }

    sendHttpResponse(client, 400, "Bad Request", "text/plain", "Invalid payload");
    client.stop();
    return "";
}
