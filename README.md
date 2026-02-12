# ADB MCP Server

A Model Context Protocol (MCP) server for Android Debug Bridge (ADB). This TypeScript-based tool provides a bridge between AI models and Android device functionality, enabling programmatic interaction with Android devices through a standardized protocol.

## Features

- 📱 **Device Management** - List and interact with connected Android devices
- 📦 **App Installation** - Deploy APK files to connected devices
- 📋 **Logging** - Access device logs through logcat
- 🔄 **File Transfer** - Push and pull files between device and host
- 📸 **UI Interaction** - Capture screenshots and analyze UI hierarchy
- 🔧 **Shell Command Execution** - Run custom commands on the device
- 📦 **Package Management** - List, install, and manage packages
- 🎯 **Activity Management** - Start activities and broadcast intents

## Prerequisites

- Node.js (v16 or higher)
- ADB (Android Debug Bridge) installed and in your PATH
- An Android device or emulator with USB debugging enabled
- Permission to access the device (accepted debugging authorization on device)

## Installation

### From npm (when published)

```bash
npm install -g adb-mcp
```

### From source

```bash
# Clone the repository
git clone https://github.com/marvel1203/adb_mcp.git
cd adb_mcp

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Run the server
npx adb-mcp
```

## Configuration

### ADB Path Configuration

The server uses the `adb` command from your PATH by default. For a custom ADB location:

```bash
export ADB_PATH=/path/to/adb
npx adb-mcp
```

### MCP Configuration

Add the ADB MCP server to your MCP client configuration. For example, in Claude Desktop:

```json
{
  "mcpServers": {
    "adb": {
      "command": "npx",
      "args": ["adb-mcp"]
    }
  }
}
```

Or if installed from source:

```json
{
  "mcpServers": {
    "adb": {
      "command": "node",
      "args": ["/path/to/adb_mcp/dist/index.js"]
    }
  }
}
```

## Usage

### Starting the Server

The server runs via stdio and is typically managed by your MCP client. If running manually:

```bash
npx adb-mcp
```

You should see:
```
ADB MCP Server running on stdio
```

### Available Tools

#### 📱 Device Management

- **adb_devices** - List all connected devices
  ```
  No parameters required
  ```

- **adb_shell** - Execute shell commands on a device
  ```
  Parameters:
  - command (required): Shell command to execute
  - device_serial (optional): Device serial number
  ```

#### 📦 App Management

- **adb_install** - Install an APK file
  ```
  Parameters:
  - apk_path (required): Local path to the APK file
  - device_serial (optional): Device serial number
  - reinstall (optional): Reinstall if app exists (default: false)
  ```

- **adb_package_manager** - Execute Package Manager (pm) commands
  ```
  Parameters:
  - command (required): pm command (e.g., 'list packages', 'grant <package> <permission>')
  - device_serial (optional): Device serial number
  ```

- **adb_activity_manager** - Execute Activity Manager (am) commands
  ```
  Parameters:
  - command (required): am command (e.g., 'start -n <component>', 'broadcast -a <action>')
  - device_serial (optional): Device serial number
  ```

#### 📋 Logging

- **adb_logcat** - View device logs with optional filtering
  ```
  Parameters:
  - filter (optional): Filter expression (e.g., 'ActivityManager:I *:S')
  - device_serial (optional): Device serial number
  - max_lines (optional): Maximum number of lines to return (default: 100)
  ```

#### 🔄 File Transfer

- **adb_pull** - Pull a file from the device
  ```
  Parameters:
  - remote_path (required): Path on the device
  - local_path (required): Local destination path
  - device_serial (optional): Device serial number
  ```

- **adb_push** - Push a file to the device
  ```
  Parameters:
  - local_path (required): Local file path
  - remote_path (required): Destination path on the device
  - device_serial (optional): Device serial number
  ```

#### 🔍 UI Interaction

- **adb_screenshot** - Take a screenshot
  ```
  Parameters:
  - output_path (required): Local path to save the screenshot
  - device_serial (optional): Device serial number
  ```

- **adb_ui_hierarchy** - Get UI hierarchy in XML format
  ```
  Parameters:
  - device_serial (optional): Device serial number
  ```

## Troubleshooting

### Device Connection Issues

- Verify device connection: Use `adb_devices` tool
- If "unauthorized", accept debugging authorization on device
- Check USB/network connections
- Try restarting ADB: `adb kill-server && adb start-server`

### ADB Issues

- Verify ADB installation: `adb version`
- Ensure ADB is in your PATH or set `ADB_PATH` environment variable

### Multiple Devices

When multiple devices are connected, you must specify the `device_serial` parameter for each tool call. Get the serial number using `adb_devices`.

## Compatibility

- Android 8.0 and higher recommended
- MCP clients (Claude Desktop, etc.)
- Tested on macOS and Linux
- Windows support available

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run watch
```

## License

Apache-2.0

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.