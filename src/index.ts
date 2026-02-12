#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";

const execAsync = promisify(exec);

// Get ADB path from environment or use default
const ADB_PATH = process.env.ADB_PATH || "adb";

// Execute ADB command
async function executeAdb(args: string[]): Promise<string> {
  try {
    const command = `${ADB_PATH} ${args.join(" ")}`;
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });
    
    if (stderr && !stdout) {
      throw new Error(stderr);
    }
    
    return stdout || stderr;
  } catch (error: any) {
    throw new Error(`ADB command failed: ${error.message}`);
  }
}

// Get device serial if only one device is connected
async function getDeviceSerial(deviceSerial?: string): Promise<string> {
  if (deviceSerial) {
    return deviceSerial;
  }

  const output = await executeAdb(["devices"]);
  const lines = output.split("\n").filter((line) => line.trim() && !line.includes("List of devices"));
  
  if (lines.length === 0) {
    throw new Error("No devices connected");
  }
  
  if (lines.length > 1) {
    throw new Error("Multiple devices connected. Please specify device_serial parameter");
  }
  
  const serial = lines[0].split("\t")[0];
  return serial;
}

// Create the MCP server
const server = new Server(
  {
    name: "adb-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "adb_devices",
        description: "List all connected Android devices",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "adb_shell",
        description: "Execute a shell command on the Android device",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Shell command to execute",
            },
            device_serial: {
              type: "string",
              description: "Device serial number (optional if only one device)",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "adb_install",
        description: "Install an APK file on the device",
        inputSchema: {
          type: "object",
          properties: {
            apk_path: {
              type: "string",
              description: "Local path to the APK file",
            },
            device_serial: {
              type: "string",
              description: "Device serial number (optional if only one device)",
            },
            reinstall: {
              type: "boolean",
              description: "Reinstall the app if it already exists (default: false)",
            },
          },
          required: ["apk_path"],
        },
      },
      {
        name: "adb_logcat",
        description: "View device logs with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            filter: {
              type: "string",
              description: "Filter expression (e.g., 'ActivityManager:I *:S')",
            },
            device_serial: {
              type: "string",
              description: "Device serial number (optional if only one device)",
            },
            max_lines: {
              type: "number",
              description: "Maximum number of lines to return (default: 100)",
            },
          },
        },
      },
      {
        name: "adb_pull",
        description: "Pull a file from the device to the local system",
        inputSchema: {
          type: "object",
          properties: {
            remote_path: {
              type: "string",
              description: "Path on the device",
            },
            local_path: {
              type: "string",
              description: "Local destination path",
            },
            device_serial: {
              type: "string",
              description: "Device serial number (optional if only one device)",
            },
          },
          required: ["remote_path", "local_path"],
        },
      },
      {
        name: "adb_push",
        description: "Push a file from the local system to the device",
        inputSchema: {
          type: "object",
          properties: {
            local_path: {
              type: "string",
              description: "Local file path",
            },
            remote_path: {
              type: "string",
              description: "Destination path on the device",
            },
            device_serial: {
              type: "string",
              description: "Device serial number (optional if only one device)",
            },
          },
          required: ["local_path", "remote_path"],
        },
      },
      {
        name: "adb_screenshot",
        description: "Take a screenshot of the device screen",
        inputSchema: {
          type: "object",
          properties: {
            output_path: {
              type: "string",
              description: "Local path to save the screenshot",
            },
            device_serial: {
              type: "string",
              description: "Device serial number (optional if only one device)",
            },
          },
          required: ["output_path"],
        },
      },
      {
        name: "adb_ui_hierarchy",
        description: "Get the UI hierarchy in XML format for UI analysis",
        inputSchema: {
          type: "object",
          properties: {
            device_serial: {
              type: "string",
              description: "Device serial number (optional if only one device)",
            },
          },
        },
      },
      {
        name: "adb_package_manager",
        description: "Execute Package Manager (pm) commands - list packages, grant/revoke permissions",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Package manager command (e.g., 'list packages', 'grant <package> <permission>')",
            },
            device_serial: {
              type: "string",
              description: "Device serial number (optional if only one device)",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "adb_activity_manager",
        description: "Execute Activity Manager (am) commands - start activities, broadcast intents",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Activity manager command (e.g., 'start -n <component>', 'broadcast -a <action>')",
            },
            device_serial: {
              type: "string",
              description: "Device serial number (optional if only one device)",
            },
          },
          required: ["command"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "adb_devices": {
        const output = await executeAdb(["devices", "-l"]);
        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "adb_shell": {
        const { command, device_serial } = args as { command: string; device_serial?: string };
        const serial = await getDeviceSerial(device_serial);
        const output = await executeAdb(["-s", serial, "shell", command]);
        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "adb_install": {
        const { apk_path, device_serial, reinstall } = args as {
          apk_path: string;
          device_serial?: string;
          reinstall?: boolean;
        };
        const serial = await getDeviceSerial(device_serial);
        const installArgs = ["-s", serial, "install"];
        if (reinstall) {
          installArgs.push("-r");
        }
        installArgs.push(apk_path);
        const output = await executeAdb(installArgs);
        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "adb_logcat": {
        const { filter, device_serial, max_lines } = args as {
          filter?: string;
          device_serial?: string;
          max_lines?: number;
        };
        const serial = await getDeviceSerial(device_serial);
        const logcatArgs = ["-s", serial, "logcat", "-d"];
        if (filter) {
          logcatArgs.push(filter);
        }
        const output = await executeAdb(logcatArgs);
        const lines = output.split("\n");
        const maxLines = max_lines || 100;
        const limitedOutput = lines.slice(-maxLines).join("\n");
        return {
          content: [
            {
              type: "text",
              text: limitedOutput,
            },
          ],
        };
      }

      case "adb_pull": {
        const { remote_path, local_path, device_serial } = args as {
          remote_path: string;
          local_path: string;
          device_serial?: string;
        };
        const serial = await getDeviceSerial(device_serial);
        const output = await executeAdb(["-s", serial, "pull", remote_path, local_path]);
        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "adb_push": {
        const { local_path, remote_path, device_serial } = args as {
          local_path: string;
          remote_path: string;
          device_serial?: string;
        };
        const serial = await getDeviceSerial(device_serial);
        const output = await executeAdb(["-s", serial, "push", local_path, remote_path]);
        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "adb_screenshot": {
        const { output_path, device_serial } = args as {
          output_path: string;
          device_serial?: string;
        };
        const serial = await getDeviceSerial(device_serial);
        const remotePath = "/sdcard/screenshot.png";
        
        // Take screenshot on device
        await executeAdb(["-s", serial, "shell", "screencap", "-p", remotePath]);
        
        // Pull to local system
        await executeAdb(["-s", serial, "pull", remotePath, output_path]);
        
        // Clean up remote file
        await executeAdb(["-s", serial, "shell", "rm", remotePath]);
        
        return {
          content: [
            {
              type: "text",
              text: `Screenshot saved to ${output_path}`,
            },
          ],
        };
      }

      case "adb_ui_hierarchy": {
        const { device_serial } = args as { device_serial?: string };
        const serial = await getDeviceSerial(device_serial);
        const remotePath = "/sdcard/window_dump.xml";
        
        // Dump UI hierarchy
        await executeAdb(["-s", serial, "shell", "uiautomator", "dump", remotePath]);
        
        // Read the XML content
        const xmlContent = await executeAdb(["-s", serial, "shell", "cat", remotePath]);
        
        // Clean up remote file
        await executeAdb(["-s", serial, "shell", "rm", remotePath]);
        
        return {
          content: [
            {
              type: "text",
              text: xmlContent,
            },
          ],
        };
      }

      case "adb_package_manager": {
        const { command, device_serial } = args as {
          command: string;
          device_serial?: string;
        };
        const serial = await getDeviceSerial(device_serial);
        const output = await executeAdb(["-s", serial, "shell", "pm", ...command.split(" ")]);
        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "adb_activity_manager": {
        const { command, device_serial } = args as {
          command: string;
          device_serial?: string;
        };
        const serial = await getDeviceSerial(device_serial);
        const output = await executeAdb(["-s", serial, "shell", "am", ...command.split(" ")]);
        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ADB MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
