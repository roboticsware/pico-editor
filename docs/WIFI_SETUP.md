# Raspberry Pi Pico W WiFi Setup Guide

This guide explains how to set up WiFi connectivity on your Raspberry Pi Pico W to use with Pico Editor wirelessly.

## Prerequisites

1. **Raspberry Pi Pico W** (the WiFi-enabled version)
2. **MicroPython firmware** installed on the Pico W
3. **WiFi network** or ability to use the Pico W's Access Point mode

## Step 1: Install MicroPython on Pico W

1. Download the latest MicroPython firmware for Pico W from: https://micropython.org/download/rp2-pico-w/
2. Hold the BOOTSEL button while connecting the Pico W to your computer
3. Drag and drop the `.uf2` file to the RPI-RP2 drive
4. The Pico W will reboot automatically

## Step 2: Configure WebREPL

Connect to the Pico W via USB serial and run the following commands:

```python
import webrepl_setup
```

Follow the prompts:
1. Enable WebREPL on boot: **Yes (E)**
2. Set a password (remember this password!)
3. Reboot when prompted

## Step 3: Configure WiFi

### Option A: Connect to Existing WiFi Network (Recommended)

```python
import network
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect('YOUR_WIFI_SSID', 'YOUR_WIFI_PASSWORD')

# Wait for connection
import time
while not wlan.isconnected():
    time.sleep(1)

# Get IP address
print('Connected! IP:', wlan.ifconfig()[0])
```

Save this IP address - you'll need it to connect from Pico Editor.

### Option B: Use Access Point Mode

```python
import network
ap = network.WLAN(network.AP_IF)
ap.active(True)
ap.config(essid='PicoW-AP', password='picoeditor123')

# Get IP address (usually 192.168.4.1)
print('AP IP:', ap.ifconfig()[0])
```

Your tablet/computer can now connect to the "PicoW-AP" WiFi network.

## Step 4: Auto-Start WiFi and WebREPL

Create a `boot.py` file on the Pico W:

```python
# boot.py
import network
import webrepl

# For existing WiFi network
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect('YOUR_WIFI_SSID', 'YOUR_WIFI_PASSWORD')

# OR for Access Point mode
# ap = network.WLAN(network.AP_IF)
# ap.active(True)
# ap.config(essid='PicoW-AP', password='picoeditor123')

# Start WebREPL
webrepl.start()
```

Save this file and reboot the Pico W. WiFi and WebREPL will now start automatically.

## Step 5: Connect from Pico Editor

1. Open Pico Editor on your tablet/computer
2. Ensure your tablet is on the same WiFi network as the Pico W (or connected to Pico's AP)
3. Click the WiFi connection button in the navigation bar
4. Enter:
   - **Host**: The IP address from Step 3 (e.g., `192.168.1.100` or `192.168.4.1`)
   - **Port**: `8266` (default WebREPL port)
   - **Password**: The password you set in Step 2
5. Click "Connect"

## Troubleshooting

### Cannot connect to WebREPL
- Verify the Pico W is powered on and WiFi is active
- Check that you're on the same network
- Ping the Pico's IP address to verify connectivity
- Ensure WebREPL is running: `import webrepl; webrepl.start()`

### WiFi connection drops
- Check WiFi signal strength
- Consider using Access Point mode for more stable connection
- Ensure the Pico W is adequately powered (use quality USB cable/power supply)

### Slow file transfer
- WiFi file transfer is slower than USB serial
- For large files, consider using USB connection
- Ensure good WiFi signal strength

## Advanced: Set Static IP

For consistent connections, you can set a static IP on the Pico W:

```python
import network
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.ifconfig(('192.168.1.100', '255.255.255.0', '192.168.1.1', '8.8.8.8'))
wlan.connect('YOUR_SSID', 'YOUR_PASSWORD')
```

## Security Notes

- Use a strong WebREPL password
- In Access Point mode, use a strong WiFi password
- WebREPL is not encrypted - avoid sending sensitive data over public networks
- Consider using WebREPL only on trusted networks

## Additional Resources

- [MicroPython WebREPL Documentation](https://docs.micropython.org/en/latest/esp8266/tutorial/repl.html#webrepl-a-prompt-over-wifi)
- [Pico W Documentation](https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html)
- [MicroPython Network Module](https://docs.micropython.org/en/latest/library/network.html)
