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
    throw new Error(`ADB 命令执行失败: ${error.message}`);
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
    throw new Error("未连接设备");
  }
  
  if (lines.length > 1) {
    throw new Error("连接了多个设备。请指定 device_serial 参数");
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
        description: "列出所有已连接的 Android 设备",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "adb_shell",
        description: "在 Android 设备上执行 shell 命令",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "要执行的 shell 命令",
            },
            device_serial: {
              type: "string",
              description: "设备序列号（如果只有一个设备则可选）",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "adb_install",
        description: "在设备上安装 APK 文件",
        inputSchema: {
          type: "object",
          properties: {
            apk_path: {
              type: "string",
              description: "APK 文件的本地路径",
            },
            device_serial: {
              type: "string",
              description: "设备序列号（如果只有一个设备则可选）",
            },
            reinstall: {
              type: "boolean",
              description: "如果应用已存在则重新安装（默认：false）",
            },
          },
          required: ["apk_path"],
        },
      },
      {
        name: "adb_logcat",
        description: "查看设备日志，支持可选过滤",
        inputSchema: {
          type: "object",
          properties: {
            filter: {
              type: "string",
              description: "过滤表达式（例如：'ActivityManager:I *:S'）",
            },
            device_serial: {
              type: "string",
              description: "设备序列号（如果只有一个设备则可选）",
            },
            max_lines: {
              type: "number",
              description: "返回的最大行数（默认：100）",
            },
          },
        },
      },
      {
        name: "adb_pull",
        description: "从设备拉取文件到本地系统",
        inputSchema: {
          type: "object",
          properties: {
            remote_path: {
              type: "string",
              description: "设备上的路径",
            },
            local_path: {
              type: "string",
              description: "本地目标路径",
            },
            device_serial: {
              type: "string",
              description: "设备序列号（如果只有一个设备则可选）",
            },
          },
          required: ["remote_path", "local_path"],
        },
      },
      {
        name: "adb_push",
        description: "从本地系统推送文件到设备",
        inputSchema: {
          type: "object",
          properties: {
            local_path: {
              type: "string",
              description: "本地文件路径",
            },
            remote_path: {
              type: "string",
              description: "设备上的目标路径",
            },
            device_serial: {
              type: "string",
              description: "设备序列号（如果只有一个设备则可选）",
            },
          },
          required: ["local_path", "remote_path"],
        },
      },
      {
        name: "adb_screenshot",
        description: "截取设备屏幕截图",
        inputSchema: {
          type: "object",
          properties: {
            output_path: {
              type: "string",
              description: "保存截图的本地路径",
            },
            device_serial: {
              type: "string",
              description: "设备序列号（如果只有一个设备则可选）",
            },
          },
          required: ["output_path"],
        },
      },
      {
        name: "adb_ui_hierarchy",
        description: "获取 XML 格式的 UI 层次结构用于 UI 分析",
        inputSchema: {
          type: "object",
          properties: {
            device_serial: {
              type: "string",
              description: "设备序列号（如果只有一个设备则可选）",
            },
          },
        },
      },
      {
        name: "adb_package_manager",
        description: "执行包管理器（pm）命令 - 列出软件包、授予/撤销权限。注意：带空格的参数应避免复杂的引号。",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "包管理器命令（例如：'list packages'、'grant <package> <permission>'）。仅支持简单的空格分隔参数。",
            },
            device_serial: {
              type: "string",
              description: "设备序列号（如果只有一个设备则可选）",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "adb_activity_manager",
        description: "执行活动管理器（am）命令 - 启动活动、广播意图。注意：带空格的参数应避免复杂的引号。",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "活动管理器命令（例如：'start -n <component>'、'broadcast -a <action>'）。仅支持简单的空格分隔参数。",
            },
            device_serial: {
              type: "string",
              description: "设备序列号（如果只有一个设备则可选）",
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
        const timestamp = Date.now();
        const remotePath = `/sdcard/screenshot_${timestamp}.png`;
        
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
              text: `截图已保存到 ${output_path}`,
            },
          ],
        };
      }

      case "adb_ui_hierarchy": {
        const { device_serial } = args as { device_serial?: string };
        const serial = await getDeviceSerial(device_serial);
        const timestamp = Date.now();
        const remotePath = `/sdcard/window_dump_${timestamp}.xml`;
        
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
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `错误: ${error.message}`,
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
  console.error("ADB MCP 服务器运行在 stdio");
}

main().catch((error) => {
  console.error("致命错误:", error);
  process.exit(1);
});
