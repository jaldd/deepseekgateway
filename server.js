const express = require('express');
const BrowserManager = require('./browser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 9083;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use((req, res, next) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

const API_KEY = process.env.API_KEY || 'local';

app.use((req, res, next) => {
  const publicPaths = ['/', '/health', '/v1/models'];
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'] || 
                 req.headers['authorization']?.replace('Bearer ', '') ||
                 req.query.api_key;
  
  if (apiKey !== API_KEY) {
    console.log('[Security] 未授权的 API 访问尝试');
    return res.status(401).json({
      type: 'error',
      error: {
        type: 'authentication_error',
        message: 'Invalid API key'
      }
    });
  }
  
  next();
});

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 100;

app.use((req, res, next) => {
  const publicPaths = ['/', '/health', '/v1/models'];
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(clientIp)) {
    requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const clientData = requestCounts.get(clientIp);
    
    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
      clientData.count++;
      
      if (clientData.count > RATE_LIMIT_MAX) {
        console.log(`[Security] IP ${clientIp} 超过频率限制`);
        return res.status(429).json({
          type: 'error',
          error: {
            type: 'rate_limit_error',
            message: 'Too many requests. Please try again later.'
          }
        });
      }
    }
  }
  
  next();
});

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

const browserManager = new BrowserManager();

const requestCache = new Map();
const CACHE_TTL = 30000;

function getCachedResponse(message) {
  const cached = requestCache.get(message);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  return null;
}

function setCachedResponse(message, response) {
  requestCache.set(message, {
    response: response,
    timestamp: Date.now()
  });
  
  if (requestCache.size > 100) {
    const oldestKey = requestCache.keys().next().value;
    requestCache.delete(oldestKey);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
}, CACHE_TTL);

async function resolveFileReferences(text) {
  const filePatterns = [
    /@file:(\/[^\s]+)/g,
    /@file:\/\/([^\s]+)/g,
    /\[([^\]]+)\]\(file:\/\/([^\)]+)\)/g
  ];
  
  let resolvedText = text;
  const resolvedFiles = [];
  
  const fileUrlPattern = /@file:?(?:\/+)?([A-Za-z]:[^\s]+)/gi;
  let match;
  
  while ((match = fileUrlPattern.exec(text)) !== null) {
    const filePath = decodeURIComponent(match[1]).replace(/\//g, path.sep);
    
    try {
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf8');
        const ext = path.extname(filePath);
        const langMap = {
          '.js': 'javascript',
          '.ts': 'typescript',
          '.py': 'python',
          '.java': 'java',
          '.go': 'go',
          '.rs': 'rust',
          '.c': 'c',
          '.cpp': 'cpp',
          '.h': 'c',
          '.hpp': 'cpp',
          '.cs': 'csharp',
          '.rb': 'ruby',
          '.php': 'php',
          '.swift': 'swift',
          '.kt': 'kotlin',
          '.scala': 'scala',
          '.json': 'json',
          '.xml': 'xml',
          '.html': 'html',
          '.css': 'css',
          '.scss': 'scss',
          '.sql': 'sql',
          '.sh': 'bash',
          '.yaml': 'yaml',
          '.yml': 'yaml',
          '.md': 'markdown',
          '.vue': 'vue',
          '.jsx': 'jsx',
          '.tsx': 'tsx'
        };
        
        const lang = langMap[ext] || '';
        const fileName = path.basename(filePath);
        
        const fileBlock = `\n\n---\n文件: ${fileName}\n\`\`\`${lang}\n${content}\n\`\`\`\n---\n`;
        
        resolvedText = resolvedText.replace(match[0], fileBlock);
        resolvedFiles.push(fileName);
        
        console.log('[Server] 已读取文件:', fileName, '大小:', content.length);
      } else {
        console.log('[Server] 文件不存在:', filePath);
      }
    } catch (error) {
      console.error('[Server] 读取文件失败:', filePath, error.message);
    }
  }
  
  const markdownFilePattern = /\[([^\]]+)\]\(file:\/\/\/([^\)]+)\)/g;
  while ((match = markdownFilePattern.exec(text)) !== null) {
    const filePath = decodeURIComponent(match[2]).replace(/\//g, path.sep);
    
    try {
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf8');
        const ext = path.extname(filePath);
        const langMap = {
          '.js': 'javascript',
          '.ts': 'typescript',
          '.py': 'python',
          '.java': 'java',
          '.go': 'go',
          '.rs': 'rust',
          '.c': 'c',
          '.cpp': 'cpp',
          '.h': 'c',
          '.hpp': 'cpp',
          '.cs': 'csharp',
          '.rb': 'ruby',
          '.php': 'php',
          '.swift': 'swift',
          '.kt': 'kotlin',
          '.scala': 'scala',
          '.json': 'json',
          '.xml': 'xml',
          '.html': 'html',
          '.css': 'css',
          '.scss': 'scss',
          '.sql': 'sql',
          '.sh': 'bash',
          '.yaml': 'yaml',
          '.yml': 'yaml',
          '.md': 'markdown',
          '.vue': 'vue',
          '.jsx': 'jsx',
          '.tsx': 'tsx'
        };
        
        const lang = langMap[ext] || '';
        const fileName = path.basename(filePath);
        
        const fileBlock = `\n\n---\n文件: ${fileName}\n\`\`\`${lang}\n${content}\n\`\`\`\n---\n`;
        
        resolvedText = resolvedText.replace(match[0], fileBlock);
        resolvedFiles.push(fileName);
        
        console.log('[Server] 已读取文件:', fileName, '大小:', content.length);
      }
    } catch (error) {
      console.error('[Server] 读取文件失败:', filePath, error.message);
    }
  }
  
  if (resolvedFiles.length > 0) {
    console.log('[Server] 共解析', resolvedFiles.length, '个文件引用');
  }
  
  return resolvedText;
}

function generateChatId() {
  return 'chatcmpl-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateAnthropicId() {
  return 'msg_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function createOpenAIResponse(content, model = 'deepseek-chat') {
  return {
    id: generateChatId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: content
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
    };
}

function createAnthropicResponse(content, model = 'claude-3-opus-20240229') {
  return {
    id: generateAnthropicId(),
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: content
      }
    ],
    model: model,
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 0,
      output_tokens: 0
    }
  };
}

app.post('/v1/chat/completions', async (req, res) => {
  console.log('[Server] 收到 OpenAI 请求');
  
  try {
    const { messages, model } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'messages 数组不能为空',
          type: 'invalid_request_error'
        }
      });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      return res.status(400).json({
        error: {
          message: '找不到用户消息',
          type: 'invalid_request_error'
        }
      });
    }

    const userContent = lastUserMessage.content;
    console.log('[Server] 用户消息长度:', typeof userContent === 'string' ? userContent.length : 'array');

    if (!browserManager.isLoggedIn) {
      return res.status(503).json({
        error: {
          message: '浏览器未登录或登录已过期，请检查浏览器窗口',
          type: 'service_unavailable_error'
        }
      });
    }

    console.log('[Server] 开始处理请求...');
    const response = await browserManager.sendMessage(userContent);
    
    const openaiResponse = createOpenAIResponse(response, model || 'deepseek-chat');
    console.log('[Server] 请求处理完成');
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(openaiResponse);
  } catch (error) {
    console.error('[Server] 处理请求失败:', error.message);
    
    if (error.message.includes('正在处理其他请求')) {
      return res.status(429).json({
        error: {
          message: '服务繁忙，请稍后重试',
          type: 'rate_limit_error'
        }
      });
    }

    res.status(500).json({
      error: {
        message: 'Internal server error',
        type: 'internal_error'
      }
    });
  }
});

app.post('/v1/messages', async (req, res) => {
  console.log('[Server] 收到 Anthropic 请求');
  console.log('[Server] 模型:', req.body.model);
  console.log('[Server] 消息数量:', req.body.messages?.length);
  
  try {
    const { messages, model, max_tokens } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message: 'messages 数组不能为空'
        }
      });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      return res.status(400).json({
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message: '找不到用户消息'
        }
      });
    }

    console.log('[Server] 最后一条用户消息类型:', typeof lastUserMessage.content);
    console.log('[Server] 消息内容是否为数组:', Array.isArray(lastUserMessage.content));
    
    let userContent;
    if (typeof lastUserMessage.content === 'string') {
      userContent = lastUserMessage.content;
    } else if (Array.isArray(lastUserMessage.content)) {
      const textElements = lastUserMessage.content.filter(c => c.type === 'text' && c.text);
      
      const userTextElement = textElements.find(el => 
        !el.text.includes('<system-reminder>') && el.text.trim().length > 0
      );
      
      if (userTextElement) {
        userContent = userTextElement.text;
        console.log('[Server] 找到用户输入元素');
      } else {
        const lastElement = textElements[textElements.length - 1];
        userContent = lastElement ? lastElement.text : '';
        console.log('[Server] 使用最后一个text元素');
      }
    } else {
      userContent = String(lastUserMessage.content);
    }

    let codeContext = '';
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      let systemContent = '';
      if (typeof systemMessage.content === 'string') {
        systemContent = systemMessage.content;
      } else if (Array.isArray(systemMessage.content)) {
        systemContent = systemMessage.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n');
      }
      
      systemContent = systemContent
        .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
        .replace(/<env>[\s\S]*?<\/env>/g, '')
        .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '')
        .replace(/<function_results>[\s\S]*?<\/function_results>/g, '')
        .trim();
      
      if (systemContent.length > 100) {
        console.log('[Server] 提取到代码上下文，原始长度:', systemContent.length);
        
        const fileReferences = systemContent.match(/\[.*?\]\(file:\/\/[^\)]+\)/g) || [];
        const codeBlocks = systemContent.match(/```[\s\S]*?```/g) || [];
        
        let contextParts = [];
        
        if (fileReferences.length > 0) {
          contextParts.push('相关文件:\n' + fileReferences.slice(0, 20).join('\n'));
        }
        
        if (codeBlocks.length > 0) {
          const totalCode = codeBlocks.join('\n\n');
          if (totalCode.length > 500) {
            contextParts.push('代码片段:\n' + totalCode.substring(0, 6000));
          }
        }
        
        if (contextParts.length > 0) {
          codeContext = '<上下文信息>\n' + contextParts.join('\n\n') + '\n</上下文信息>\n\n';
          console.log('[Server] 构建上下文，长度:', codeContext.length);
        } else if (systemContent.length < 5000) {
          codeContext = '<上下文信息>\n' + systemContent + '\n</上下文信息>\n\n';
          console.log('[Server] 使用完整上下文');
        }
      }
    }
    
    const finalMessage = codeContext + userContent;
    console.log('[Server] 最终消息长度:', finalMessage.length);
    
    const resolvedMessage = await resolveFileReferences(finalMessage);
    if (resolvedMessage !== finalMessage) {
      console.log('[Server] 解析文件引用后消息长度:', resolvedMessage.length);
    }

    const cachedResponse = getCachedResponse(userContent);
    if (cachedResponse) {
      console.log('[Server] 使用缓存的响应');
      return res.setHeader('Content-Type', 'application/json; charset=utf-8').json(cachedResponse);
    }

    if (!browserManager.isLoggedIn) {
      return res.status(503).json({
        type: 'error',
        error: {
          type: 'service_unavailable_error',
          message: '浏览器未登录或登录已过期，请检查浏览器窗口'
        }
      });
    }

    console.log('[Server] 开始处理 Anthropic 请求...');
    const response = await browserManager.sendMessage(resolvedMessage);
    
    const anthropicResponse = createAnthropicResponse(response, model || 'claude-3-opus-20240229');
    console.log('[Server] Anthropic 请求处理完成');
    
    setCachedResponse(userContent, anthropicResponse);
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(anthropicResponse);
  } catch (error) {
    console.error('[Server] 处理 Anthropic 请求失败:', error.message);
    
    if (error.message.includes('正在处理其他请求')) {
      return res.status(429).json({
        type: 'error',
        error: {
          type: 'rate_limit_error',
          message: '服务繁忙，请稍后重试'
        }
      });
    }

    res.status(500).json({
      type: 'error',
      error: {
        type: 'internal_error',
        message: 'Internal server error'
      }
    });
  }
});

app.get('/v1/models', (req, res) => {
  console.log('[Server] 收到 /v1/models 请求');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({
    object: 'list',
    data: [
      {
        id: 'claude-3-opus-20240229',
        object: 'model',
        created: 1706659200,
        owned_by: 'anthropic',
        permission: [],
        root: 'claude-3-opus-20240229',
        parent: null
      },
      {
        id: 'claude-3-sonnet-20240229',
        object: 'model',
        created: 1706659200,
        owned_by: 'anthropic',
        permission: [],
        root: 'claude-3-sonnet-20240229',
        parent: null
      },
      {
        id: 'claude-3-haiku-20240307',
        object: 'model',
        created: 1709769600,
        owned_by: 'anthropic',
        permission: [],
        root: 'claude-3-haiku-20240307',
        parent: null
      },
      {
        id: 'deepseek-chat',
        object: 'model',
        created: 1706659200,
        owned_by: 'deepseek',
        permission: [],
        root: 'deepseek-chat',
        parent: null
      }
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    browserReady: browserManager.isLoggedIn,
    isProcessing: browserManager.isProcessing
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'OpenClaw-Zero-Token Gateway',
    version: '1.0.0',
    endpoints: {
      'POST /v1/chat/completions': 'OpenAI 兼容的聊天接口',
      'POST /v1/messages': 'Anthropic Claude 兼容的聊天接口',
      'GET /health': '健康检查'
    }
  });
});

async function startServer() {
  console.log('========================================');
  console.log('  OpenClaw-Zero-Token 本地网关');
  console.log('========================================');
  console.log('');
  
  try {
    console.log('[Server] 正在初始化浏览器...');
    await browserManager.init();
    
    app.listen(PORT, () => {
      console.log('');
      console.log(`[Server] Gateway ready on http://localhost:${PORT}`);
      console.log('');
      console.log('OpenAI 兼容接口:');
      console.log(`curl -X POST http://localhost:${PORT}/v1/chat/completions \\`);
      console.log('  -H "Content-Type: application/json" \\');
      console.log('  -d \'{"model":"deepseek-chat","messages":[{"role":"user","content":"你好"}]}\'');
      console.log('');
      console.log('Anthropic Claude 兼容接口:');
      console.log(`curl -X POST http://localhost:${PORT}/v1/messages \\`);
      console.log('  -H "Content-Type: application/json" \\');
      console.log('  -H "x-api-key: local" \\');
      console.log('  -d \'{"model":"claude-3-opus-20240229","max_tokens":1024,"messages":[{"role":"user","content":"你好"}]}\'');
      console.log('');
    });
  } catch (error) {
    console.error('[Server] 启动失败:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n[Server] 正在关闭服务...');
  await browserManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] 正在关闭服务...');
  await browserManager.close();
  process.exit(0);
});

startServer();
