# Claude API 配置指南

## 基本配置

### 方式一：环境变量配置

在您的环境变量中设置：

```bash
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="local"
$env:ANTHROPIC_BASE_URL="http://localhost:9083/v1"

# Linux/macOS
export ANTHROPIC_API_KEY="local"
export ANTHROPIC_BASE_URL="http://localhost:9083/v1"
```

### 方式二：配置文件

在项目根目录创建 `.env` 文件：

```env
ANTHROPIC_API_KEY=local
ANTHROPIC_BASE_URL=http://localhost:9083/v1
```

## 不同 IDE 的配置方式

### 1. Cursor IDE

在 Cursor 设置中：

```json
{
  "cursor.aiProvider": "anthropic",
  "cursor.anthropic.apiKey": "local",
  "cursor.anthropic.baseUrl": "http://localhost:9083/v1",
  "cursor.anthropic.model": "claude-3-opus-20240229"
}
```

### 2. VS Code (Continue 扩展)

在 `.continue/config.json` 中：

```json
{
  "models": [
    {
      "title": "Claude 3 Opus (Local)",
      "provider": "anthropic",
      "model": "claude-3-opus-20240229",
      "apiKey": "local",
      "apiBase": "http://localhost:9083/v1"
    }
  ]
}
```

### 3. Zed Editor

在 `~/.config/zed/settings.json` 中：

```json
{
  "assistant": {
    "default_model": {
      "provider": "anthropic",
      "model": "claude-3-opus-20240229"
    },
    "version": "2"
  },
  "language_models": {
    "anthropic": {
      "api_key": "local",
      "api_base": "http://localhost:9083/v1"
    }
  }
}
```

### 4. JetBrains IDE (如 IntelliJ IDEA)

在 IDE 的 AI 助手设置中：

```json
{
  "aiAssistant": {
    "provider": "anthropic",
    "apiKey": "local",
    "baseUrl": "http://localhost:9083/v1",
    "model": "claude-3-opus-20240229"
  }
}
```

## 代码中使用

### Python (使用 Anthropic SDK)

```python
from anthropic import Anthropic

client = Anthropic(
    api_key="local",
    base_url="http://localhost:9083/v1"
)

message = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "你好"}
    ]
)

print(message.content[0].text)
```

### JavaScript/TypeScript

```javascript
const response = await fetch('http://localhost:9083/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'local',
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{ role: 'user', content: '你好' }]
  })
});

const data = await response.json();
console.log(data.content[0].text);
```

## 支持的模型列表

- `claude-3-opus-20240229` - Claude 3 Opus (最强大)
- `claude-3-sonnet-20240229` - Claude 3 Sonnet (平衡)
- `claude-3-haiku-20240307` - Claude 3 Haiku (最快)

## 测试配置

使用 curl 测试：

```bash
curl -X POST http://localhost:9083/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: local" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

## 注意事项

1. **API Key**: 可以设置为任意值，网关不验证
2. **Base URL**: 必须是 `http://localhost:9083/v1`
3. **端点**: 使用 `/v1/messages` 而不是 `/v1/chat/completions`
4. **浏览器**: 确保浏览器窗口保持打开状态
5. **登录**: 首次使用需要登录 DeepSeek

## 故障排除

### 检查网关状态
```bash
curl http://localhost:9083/health
```

### 检查浏览器状态
```bash
curl http://localhost:9083/
```

### 重启服务器
如果遇到问题，重启服务器：
```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
node server.js
```