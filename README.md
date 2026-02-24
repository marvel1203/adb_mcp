# ADB MCP Server

一个用于 Android Debug Bridge (ADB) 的 Model Context Protocol (MCP) 服务器。这个基于 TypeScript 的工具在 AI 模型和 Android 设备功能之间提供了桥梁，通过标准化协议实现与 Android 设备的程序化交互。

## 功能特性

- 📱 **设备管理** - 列出并与已连接的 Android 设备交互
- 📦 **应用安装** - 将 APK 文件部署到已连接的设备
- 📋 **日志记录** - 通过 logcat 访问设备日志
- 🔄 **文件传输** - 在设备和主机之间推送和拉取文件
- 📸 **UI 交互** - 捕获屏幕截图并分析 UI 层次结构
- 🔧 **Shell 命令执行** - 在设备上运行自定义命令
- 📦 **包管理** - 列出、安装和管理软件包
- 🎯 **Activity 管理** - 启动活动和广播意图

## 前置要求

- Node.js (v16 或更高版本)
- ADB (Android Debug Bridge) 已安装并在 PATH 中
- 已启用 USB 调试的 Android 设备或模拟器
- 访问设备的权限（在设备上接受调试授权）

## 安装

### 从 npm 安装（发布后）

```bash
npm install -g adb-mcp
```

### 从源码安装

```bash
# 克隆仓库
git clone https://github.com/marvel1203/adb_mcp.git
cd adb_mcp

# 安装依赖
npm install

# 构建 TypeScript 代码
npm run build

# 运行服务器
npx adb-mcp
```

## 配置

### ADB 路径配置

服务器默认使用 PATH 中的 `adb` 命令。如需自定义 ADB 位置：

```bash
export ADB_PATH=/path/to/adb
npx adb-mcp
```

### MCP 配置

将 ADB MCP 服务器添加到 MCP 客户端配置中。例如，在 Claude Desktop 中：

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

或者从源码安装后：

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

## 使用方法

### 启动服务器

服务器通过 stdio 运行，通常由 MCP 客户端管理。如需手动运行：

```bash
npx adb-mcp
```

您应该看到：
```
ADB MCP 服务器运行在 stdio
```

### 可用工具

#### 📱 设备管理

- **adb_devices** - 列出所有已连接的设备
  ```
  无需参数
  ```

- **adb_shell** - 在设备上执行 shell 命令
  ```
  参数：
  - command（必需）：要执行的 shell 命令
  - device_serial（可选）：设备序列号
  ```

#### 📦 应用管理

- **adb_install** - 安装 APK 文件
  ```
  参数：
  - apk_path（必需）：APK 文件的本地路径
  - device_serial（可选）：设备序列号
  - reinstall（可选）：如果应用已存在则重新安装（默认：false）
  ```

- **adb_package_manager** - 执行包管理器（pm）命令
  ```
  参数：
  - command（必需）：pm 命令（例如：'list packages'、'grant <package> <permission>'）
  - device_serial（可选）：设备序列号
  ```

- **adb_activity_manager** - 执行活动管理器（am）命令
  ```
  参数：
  - command（必需）：am 命令（例如：'start -n <component>'、'broadcast -a <action>'）
  - device_serial（可选）：设备序列号
  ```

#### 📋 日志记录

- **adb_logcat** - 查看设备日志，支持可选过滤
  ```
  参数：
  - filter（可选）：过滤表达式（例如：'ActivityManager:I *:S'）
  - device_serial（可选）：设备序列号
  - max_lines（可选）：返回的最大行数（默认：100）
  ```

#### 🔄 文件传输

- **adb_pull** - 从设备拉取文件
  ```
  参数：
  - remote_path（必需）：设备上的路径
  - local_path（必需）：本地目标路径
  - device_serial（可选）：设备序列号
  ```

- **adb_push** - 向设备推送文件
  ```
  参数：
  - local_path（必需）：本地文件路径
  - remote_path（必需）：设备上的目标路径
  - device_serial（可选）：设备序列号
  ```

#### 🔍 UI 交互

- **adb_screenshot** - 截取屏幕截图
  ```
  参数：
  - output_path（必需）：保存截图的本地路径
  - device_serial（可选）：设备序列号
  ```

- **adb_ui_hierarchy** - 获取 XML 格式的 UI 层次结构
  ```
  参数：
  - device_serial（可选）：设备序列号
  ```

## 故障排除

### 设备连接问题

- 验证设备连接：使用 `adb_devices` 工具
- 如果显示"未授权"，请在设备上接受调试授权
- 检查 USB/网络连接
- 尝试重启 ADB：`adb kill-server && adb start-server`

### ADB 问题

- 验证 ADB 安装：`adb version`
- 确保 ADB 在 PATH 中或设置 `ADB_PATH` 环境变量

### 多设备

当连接多个设备时，必须为每个工具调用指定 `device_serial` 参数。使用 `adb_devices` 获取序列号。

## 兼容性

- 推荐使用 Android 8.0 及更高版本
- MCP 客户端（Claude Desktop 等）
- 在 macOS 和 Linux 上测试通过
- 支持 Windows

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 监听模式用于开发
npm run watch
```

## 许可证

Apache-2.0

## 贡献

欢迎贡献！请随时提交 Pull Request。