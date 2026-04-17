# IntelliJ IDEA Claude 插件配置指南

## 安装 Claude 插件

### 方法一：通过插件市场安装

1. 打开 IntelliJ IDEA
2. 进入 `File` → `Settings` (Windows/Linux) 或 `Preferences` (macOS)
3. 选择 `Plugins`
4. 搜索 "Claude" 或 "Anthropic"
5. 安装以下任一插件：
   - **Claude Code** (推荐)
   - **Anthropic AI Assistant**
   - **AI Assistant**

### 方法二：手动安装

1. 下载插件 ZIP 文件
2. 进入 `Settings` → `Plugins` → `⚙️` → `Install Plugin from Disk`
3. 选择下载的 ZIP 文件

## 配置 Claude 插件

### 配置步骤

1. 打开 `Settings` → `Tools` → `Claude` (或 `AI Assistant`)

2. 配置以下信息：

```json
{
  "apiEndpoint": "http://localhost:9083/v1",
  "apiKey": "local",
  "model": "claude-3-opus-20240229",
  "maxTokens": 4096,
  "temperature": 0.7
}
```

### 详细配置选项

#### 基本设置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| API Endpoint | `http://localhost:9083/v1` | 本地网关地址 |
| API Key | `local` | 任意值即可 |
| Model | `claude-3-opus-20240229` | 使用的模型 |
| Max Tokens | `4096` | 最大输出长度 |
| Temperature | `0.7` | 创造性程度 |

#### 高级设置

```json
{
  "advanced": {
    "timeout": 60000,
    "retryAttempts": 3,
    "streamResponse": true,
    "contextWindow": 200000
  }
}
```

## 使用 Claude 插件

### 快捷键

- `Alt + C` (Windows/Linux) 或 `Option + C` (macOS) - 打开 Claude 对话框
- `Ctrl + Shift + C` - 在编辑器中选中代码后快速提问
- `Alt + Enter` - 显示 AI 建议的快速修复

### 功能特性

1. **代码补全**
   - 在编辑器中自动提供代码建议
   - 支持多种编程语言

2. **代码解释**
   - 选中代码后右键 → `Explain with Claude`
   - 获取详细的代码解释

3. **代码重构**
   - 选中代码后右键 → `Refactor with Claude`
   - AI 辅助重构代码

4. **文档生成**
   - 右键 → `Generate Documentation`
   - 自动生成代码文档

5. **单元测试生成**
   - 右键 → `Generate Tests`
   - 自动生成单元测试

## 配置文件位置

### Windows
```
C:\Users\<用户名>\.IntelliJIdea<版本>\config\options\claude.xml
```

### macOS
```
~/Library/Application Support/JetBrains/IntelliJIdea<版本>/options/claude.xml
```

### Linux
```
~/.IntelliJIdea<版本>/config/options/claude.xml
```

## XML 配置示例

如果插件支持 XML 配置，可以手动编辑：

```xml
<application>
  <component name="ClaudeSettings">
    <option name="apiEndpoint" value="http://localhost:9083/v1" />
    <option name="apiKey" value="local" />
    <option name="model" value="claude-3-opus-20240229" />
    <option name="maxTokens" value="4096" />
    <option name="temperature" value="0.7" />
    <option name="enableStreaming" value="true" />
  </component>
</application>
```

## 环境变量配置

在 IDEA 启动配置中添加环境变量：

1. 打开 `Help` → `Edit Custom VM Options`
2. 添加以下行：

```
-Danthropic.api.key=local
-Danthropic.base.url=http://localhost:9083/v1
```

## 故障排除

### 1. 连接失败

**问题**: 无法连接到 API

**解决方案**:
```bash
# 检查网关是否运行
curl http://localhost:9083/health

# 检查端口是否被占用
netstat -ano | findstr :9083
```

### 2. 认证失败

**问题**: API Key 无效

**解决方案**:
- 确保 API Key 设置为 `local` 或任意非空值
- 检查 Base URL 是否正确

### 3. 响应慢

**问题**: 响应时间过长

**解决方案**:
- 检查浏览器是否正常打开
- 确认 DeepSeek 登录状态
- 查看服务器日志

### 4. 中文乱码

**问题**: 中文显示乱码

**解决方案**:
- 确保使用最新版本的服务器代码
- 重启服务器
- 检查 IDE 编码设置

## 测试配置

### 使用内置终端测试

在 IDEA 内置终端中运行：

```bash
curl -X POST http://localhost:9083/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: local" \
  -d '{"model":"claude-3-opus-20240229","max_tokens":1024,"messages":[{"role":"user","content":"你好"}]}'
```

### 使用 HTTP Client 测试

在 IDEA 中创建 `.http` 文件：

```http
### Test Claude API
POST http://localhost:9083/v1/messages
Content-Type: application/json
x-api-key: local

{
  "model": "claude-3-opus-20240229",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "你好，请介绍一下你自己"
    }
  ]
}
```

## 推荐插件

### 官方插件
- **Claude Code** - Anthropic 官方插件
- **AI Assistant** - JetBrains AI 助手

### 第三方插件
- **CodeGPT** - 支持多种 AI 提供商
- **Bito AI** - AI 代码助手
- **Tabnine** - AI 代码补全

## 最佳实践

1. **启动顺序**
   - 先启动网关服务器
   - 等待浏览器打开并登录
   - 再启动 IDEA 和插件

2. **使用技巧**
   - 使用快捷键提高效率
   - 善用代码选中功能
   - 定期清理对话历史

3. **性能优化**
   - 适当调整 max_tokens
   - 使用流式响应
   - 避免过长的上下文

## 相关链接

- [Anthropic API 文档](https://docs.anthropic.com/)
- [IntelliJ IDEA 插件开发](https://plugins.jetbrains.com/docs/intellij/)
- [项目 GitHub](https://github.com/your-repo)

## 获取帮助

如果遇到问题：

1. 检查网关状态：`curl http://localhost:9083/health`
2. 查看服务器日志
3. 重启服务器和 IDE
4. 检查网络连接