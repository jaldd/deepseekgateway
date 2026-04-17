# OpenClaw-Zero-Token Gateway

通过 Playwright 调用 DeepSeek 网页版的本地网关，支持 OpenAI 和 Anthropic Claude API 格式。

## 功能特性

- 免费使用 DeepSeek 模型
- 兼容 OpenAI API 格式
- 兼容 Anthropic Claude API 格式
- 支持流式响应
- 自动登录状态管理
- 请求去重和缓存

## 快速开始

### 安装依赖

```bash
npm install
```

### 浏览器要求

本项目会**优先使用本地安装的 Chrome 浏览器**，无需额外安装 Playwright 浏览器。

**自动检测顺序**：
1. 本地 Chrome（推荐）
2. Playwright 自带的 Chromium（备用）

如果您的系统已安装 Chrome，直接启动即可。如果没有 Chrome，可以安装 Playwright 浏览器：

```bash
npx playwright install chromium
```

### 启动服务

Windows:
```bash
start.bat
```

Linux/macOS:
```bash
chmod +x start.sh
./start.sh
```

或者直接运行:
```bash
node server.js
```

### 访问地址

- 服务地址: http://localhost:9083
- OpenAI 兼容接口: http://localhost:9083/v1/chat/completions
- Anthropic 兼容接口: http://localhost:9083/v1/messages

## API 使用

### OpenAI 格式

```bash
curl -X POST http://localhost:9083/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

### Anthropic Claude 格式

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

## 配置说明

### Claude Code 配置

创建配置文件 `claude-config.json`:

```json
{
  "apiProvider": "anthropic",
  "apiBaseUrl": "http://localhost:9083",
  "apiKey": "local",
  "model": "claude-3-opus-20240229",
  "maxTokens": 4096
}
```

### 支持的模型

| 模型 ID | 说明 |
|---------|------|
| `claude-3-opus-20240229` | Claude 3 Opus (DeepSeek) |
| `claude-3-sonnet-20240229` | Claude 3 Sonnet (DeepSeek) |
| `claude-3-haiku-20240307` | Claude 3 Haiku (DeepSeek) |
| `deepseek-chat` | DeepSeek Chat |

## 客户端集成

### OpenAI SDK (Python)

```python
from openai import OpenAI

client = OpenAI(
    api_key="local",
    base_url="http://localhost:9083/v1"
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "你好"}]
)
print(response.choices[0].message.content)
```

### Anthropic SDK (Python)

```python
from anthropic import Anthropic

client = Anthropic(
    api_key="local",
    base_url="http://localhost:9083"
)

message = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "你好"}]
)
print(message.content[0].text)
```

### OpenAI SDK (Node.js)

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'local',
  baseURL: 'http://localhost:9083/v1'
});

const response = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: '你好' }]
});

console.log(response.choices[0].message.content);
```

## 项目结构

```
deepseekgateway/
├── server.js              # 主服务文件
├── browser.js             # 浏览器管理
├── mcp-server.js          # MCP 服务器
├── package.json           # 项目配置
├── start.bat              # Windows 启动脚本
├── start.sh               # Linux/macOS 启动脚本
├── .gitignore             # Git 忽略配置
├── .claudeignore          # Claude Code 忽略配置
├── claude-config-example.json  # Claude 配置示例
├── claude-config-optimized.json # Claude 优化配置
├── endpoints-config.json  # 端点配置
├── mcp-config.json        # MCP 配置
├── example-usage.js       # 使用示例
├── example-openai-sdk.js  # OpenAI SDK 示例
├── example-anthropic.js   # Anthropic SDK 示例
├── config-trae.bat        # Trae 配置脚本
├── CLAUDE_CONFIG.md       # Claude 配置文档
├── IDEA_CLAUDE_PLUGIN.md  # IntelliJ IDEA 插件文档
├── FIX_REQUEST_TOO_LARGE.md # 错误修复文档
└── README.md              # 项目说明
```

## 常见问题

### Q: 首次启动需要做什么？

A: 首次启动会打开浏览器窗口，需要手动登录 DeepSeek 账号。登录成功后会自动保存状态，下次启动无需重新登录。

### Q: 如何查看服务状态？

A: 访问 http://localhost:9083/health 查看健康状态。

### Q: 支持哪些客户端？

A: 支持所有兼容 OpenAI 或 Anthropic API 的客户端，包括：
- Claude Code
- Cursor
- Continue
- JetBrains AI Assistant
- 自定义脚本

### Q: 如何处理 "Request too large" 错误？

A: 参考 [FIX_REQUEST_TOO_LARGE.md](./FIX_REQUEST_TOO_LARGE.md) 文档。

### Q: 浏览器登录状态会过期吗？

A: 登录状态会自动保存到 `storage-state.json` 文件。如果过期，服务会自动提示重新登录。

## 安全配置

### 生成加密密钥

运行以下命令生成加密密钥：

```bash
npm run generate-key
```

将输出的密钥添加到 `.env` 文件：

```env
ENCRYPTION_KEY=your-generated-key-here
```

### 配置 API Key

创建 `.env` 文件：

```env
API_KEY=your-secret-api-key-here
ENCRYPTION_KEY=your-encryption-key-here
```

### 安全特性

本项目已实现以下安全措施：

- ✅ **输入过滤** - 防止 XSS 和代码注入攻击
- ✅ **登录状态加密** - AES-256 加密存储登录状态
- ✅ **API 认证** - 需要有效的 API Key 才能访问
- ✅ **频率限制** - 每分钟最多 100 次请求
- ✅ **安全响应头** - 包含 X-Frame-Options, X-XSS-Protection 等
- ✅ **错误信息隐藏** - 不暴露内部错误详情
- ✅ **日志脱敏** - 不记录敏感信息

### 安全检查

定期运行安全检查：

```bash
npm run security-check
npm run security-fix
```

## 注意事项

1. 本项目仅供学习和研究使用
2. 请遵守 DeepSeek 的使用条款
3. 不要将本项目用于商业用途
4. 建议在稳定的网络环境下使用
5. **请妥善保管 API Key 和加密密钥，不要提交到 Git**

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
