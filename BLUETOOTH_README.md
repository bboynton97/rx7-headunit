# Bluetooth Integration for RX-7 Head Unit

This project now includes comprehensive Bluetooth functionality for pairing with phones and playing music through the Raspberry Pi head unit.

## Features

- **Device Discovery**: Automatically scan for nearby Bluetooth devices
- **Device Pairing**: Pair with phones and other audio devices
- **Connection Management**: Connect/disconnect from paired devices
- **Audio Sink Detection**: Identify audio-capable devices
- **Real-time Status**: Monitor adapter and device status
- **Modern UI**: Clean, responsive interface matching the head unit aesthetic

## Prerequisites

### Hardware Requirements
- Raspberry Pi with built-in Bluetooth or USB Bluetooth adapter
- Bluetooth-enabled phone or audio device

### Software Requirements
- Linux with BlueZ (usually pre-installed on Raspberry Pi OS)
- Rust and Cargo
- Node.js and npm/bun

## Installation

1. **Install Bluetooth Dependencies** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install bluetooth bluez blueman
   ```

2. **Enable Bluetooth Service**:
   ```bash   sudo systemctl enable bluetooth
   sudo systemctl start bluetooth
   ```

3. **Add User to Bluetooth Group**:
   ```bash
   sudo usermod -a -G bluetooth $USER
   ```

4. **Build and Run the Application**:
   ```bash
   bun install
   bun run tauri dev
   ```

## Usage

### Accessing Bluetooth Settings

1. Start the head unit application
2. Navigate to the home screen
3. Click the "🔵 BT" button in the Settings panel
4. The Bluetooth settings page will open

### Pairing Your Phone

1. **Start Discovery**: Click "🔍 Start Discovery" to scan for devices
2. **Find Your Device**: Your phone should appear in the devices list
3. **Pair Device**: Click "🔗 Pair" next to your phone
4. **Accept Pairing**: On your phone, accept the pairing request
5. **Connect**: Once paired, click "🔌 Connect" to establish connection
6. **Play Music**: Start playing music on your phone - it should now play through the head unit

### Device Management

- **Unpair**: Click "🔓 Unpair" to remove a device
- **Disconnect**: Click "🔌 Disconnect" to disconnect without unpairing
- **Audio Info**: Click "🎵 Audio" to see available audio sinks (for connected devices)

## Technical Details

### Backend (Rust/Tauri)

The Bluetooth functionality is implemented using the `bluer` crate:

- **BluetoothManager**: Manages adapter state and device connections
- **Device Discovery**: Real-time scanning for nearby devices
- **Pairing/Connection**: Secure device pairing and connection management
- **Audio Sink Detection**: Identifies A2DP and AVRCP capabilities

### Frontend (Angular)

The UI is built with Angular and includes:

- **Real-time Updates**: Status polling every 2 seconds
- **Responsive Design**: Works on different screen sizes
- **Error Handling**: User-friendly error messages
- **Status Indicators**: Visual feedback for adapter and device states

### API Commands

Available Tauri commands for Bluetooth management:

- `initialize_bluetooth()` - Initialize the Bluetooth adapter
- `start_bluetooth_discovery()` - Start scanning for devices
- `stop_bluetooth_discovery()` - Stop device scanning
- `get_bluetooth_devices()` - Get list of discovered devices
- `pair_bluetooth_device(address)` - Pair with a specific device
- `unpair_bluetooth_device(address)` - Unpair a device
- `connect_bluetooth_device(address)` - Connect to a paired device
- `disconnect_bluetooth_device(address)` - Disconnect from a device
- `get_bluetooth_audio_sinks(address)` - Get audio capabilities
- `get_bluetooth_status()` - Get overall Bluetooth status

## Troubleshooting

### Common Issues

1. **Bluetooth Not Working**:
   - Check if Bluetooth service is running: `sudo systemctl status bluetooth`
   - Ensure user is in bluetooth group: `groups $USER`
   - Restart Bluetooth service: `sudo systemctl restart bluetooth`

2. **Device Not Found**:
   - Make sure your phone's Bluetooth is discoverable
   - Try restarting discovery
   - Check if device is already paired

3. **Pairing Fails**:
   - Ensure both devices are close to each other
   - Check if device is already paired elsewhere
   - Try unpairing and re-pairing

4. **Audio Not Playing**:
   - Verify device is connected (not just paired)
   - Check audio sink capabilities
   - Ensure phone is set to output audio via Bluetooth

### Debug Commands

```bash
# Check Bluetooth status
bluetoothctl show

# List devices
bluetoothctl devices

# Check adapter info
bluetoothctl info

# Manual pairing (if needed)
bluetoothctl
> scan on
> pair [device-address]
> connect [device-address]
```

## Future Enhancements

- **Audio Controls**: Volume control and track navigation
- **Multiple Devices**: Support for multiple connected devices
- **Auto-connect**: Automatically connect to previously paired devices
- **Audio Quality**: Support for high-quality audio codecs
- **Phone Integration**: Call handling and contact sync

## Contributing

To contribute to the Bluetooth functionality:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on Raspberry Pi
5. Submit a pull request

## License

This project is part of the RX-7 Head Unit project. See the main LICENSE file for details. 