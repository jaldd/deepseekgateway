const { chromium, firefox, webkit, devices } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const STORAGE_STATE_PATH = path.join(__dirname, 'storage-state.json');
const ENCRYPTED_STATE_PATH = path.join(__dirname, 'storage-state.enc');
const DEEPSEEK_URL = 'https://chat.deepseek.com/';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('[Security] 加密失败:', error.message);
    return text;
  }
}

function decrypt(text) {
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text;
    
    const iv = Buffer.from(parts[0], 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Security] 解密失败:', error.message);
    return text;
  }
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  const dangerous = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:/gi,
    /vbscript:/gi
  ];
  
  let sanitized = input;
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  const maxLen = 10000;
  if (sanitized.length > maxLen) {
    sanitized = sanitized.substring(0, maxLen);
  }
  
  return sanitized.trim();
}

class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isProcessing = false;
    this.isLoggedIn = false;
  }

  async init() {
    console.log('[Browser] 正在启动浏览器...');
    
    try {
      const encryptedStateExists = await fs.pathExists(ENCRYPTED_STATE_PATH);
      
      if (encryptedStateExists) {
        console.log('[Browser] 发现已保存的登录状态，尝试复用...');
        const encryptedState = await fs.readFile(ENCRYPTED_STATE_PATH, 'utf8');
        const decryptedState = decrypt(encryptedState);
        
        try {
          const state = JSON.parse(decryptedState);
          this.context = await this.launchBrowserWithFallback({
            headless: false,
            storageState: state,
            viewport: { width: 1280, height: 800 },
            locale: 'zh-CN',
            acceptDownloads: true
          });
          this.browser = this.context;
          this.page = this.context.pages()[0] || await this.context.newPage();
          await this.page.goto(DEEPSEEK_URL, { waitUntil: 'networkidle', timeout: 60000 });
          
          const loginCheck = await this.checkLoginStatus();
          if (loginCheck) {
            console.log('[Browser] 登录状态有效，无需重新登录');
            this.isLoggedIn = true;
            return;
          } else {
            console.log('[Browser] 登录状态已过期，需要重新登录');
            await this.context.close();
          }
        } catch (error) {
          console.log('[Browser] 登录状态解密失败，需要重新登录');
        }
      }

      console.log('[Browser] 启动新浏览器实例...');
      this.context = await this.launchBrowserWithFallback({
        headless: false,
        viewport: { width: 1280, height: 800 },
        locale: 'zh-CN',
        acceptDownloads: true
      });
      this.browser = this.context;
      this.page = this.context.pages()[0] || await this.context.newPage();
      
      await this.page.goto(DEEPSEEK_URL, { waitUntil: 'networkidle', timeout: 60000 });
      
      console.log('[Browser] 请在浏览器窗口中完成登录...');
      await this.waitForLogin();
      
    } catch (error) {
      console.error('[Browser] 启动失败:', error.message);
      throw error;
    }
  }

  async launchBrowserWithFallback(options) {
    const browserTypes = [
      { name: 'chrome', launcher: chromium, executablePath: this.getChromePath() },
      { name: 'chromium', launcher: chromium, executablePath: null }
    ];

    for (const browserType of browserTypes) {
      try {
        console.log(`[Browser] 尝试启动 ${browserType.name}...`);
        
        const launchOptions = { ...options };
        if (browserType.executablePath) {
          launchOptions.executablePath = browserType.executablePath;
        }
        
        const context = await browserType.launcher.launchPersistentContext('', launchOptions);
        console.log(`[Browser] ${browserType.name} 启动成功`);
        return context;
      } catch (error) {
        console.log(`[Browser] ${browserType.name} 启动失败: ${error.message}`);
        continue;
      }
    }

    throw new Error('所有浏览器启动失败，请确保系统已安装 Chrome 或 Chromium');
  }

  getChromePath() {
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'
    ];

    for (const path of chromePaths) {
      if (require('fs').existsSync(path)) {
        console.log(`[Browser] 找到 Chrome 路径: ${path}`);
        return path;
      }
    }

    console.log('[Browser] 未找到本地 Chrome，将使用 Playwright 自带的 Chromium');
    return null;
  }

  async checkLoginStatus() {
    try {
      await this.page.waitForTimeout(2000);
      
      const url = this.page.url();
      if (url.includes('login')) {
        return false;
      }

      const inputBox = await this.page.$('textarea');
      if (inputBox) {
        return true;
      }

      const chatInput = await this.page.$('[contenteditable="true"]');
      return chatInput !== null;
    } catch (error) {
      return false;
    }
  }

  async waitForLogin() {
    console.log('[Browser] 等待用户登录...');
    
    let loginSuccess = false;
    let attempts = 0;
    const maxAttempts = 120;

    while (!loginSuccess && attempts < maxAttempts) {
      await this.page.waitForTimeout(3000);
      loginSuccess = await this.checkLoginStatus();
      attempts++;
      
      if (attempts % 10 === 0) {
        console.log(`[Browser] 仍在等待登录... (${attempts * 3}秒)`);
      }
    }

    if (loginSuccess) {
      console.log('[Browser] 登录成功！正在保存登录状态...');
      const state = await this.context.storageState();
      const stateString = JSON.stringify(state);
      const encryptedState = encrypt(stateString);
      await fs.writeFile(ENCRYPTED_STATE_PATH, encryptedState, 'utf8');
      console.log('[Browser] 登录状态已加密保存');
      this.isLoggedIn = true;
    } else {
      throw new Error('登录超时，请重新启动服务');
    }
  }

  async sendMessage(userMessage) {
    if (this.isProcessing) {
      throw new Error('正在处理其他请求，请稍后重试');
    }

    this.isProcessing = true;
    console.log('[Browser] 开始处理消息...');

    try {
      const sanitizedMessage = sanitizeInput(userMessage);
      console.log('[Browser] 消息已过滤, 原长度:', userMessage.length, ', 过滤后长度:', sanitizedMessage.length);
      
      if (!sanitizedMessage) {
        throw new Error('消息内容无效或包含危险代码');
      }
      
      await this.ensurePageReady();
      
      const inputSelector = await this.findInputSelector();
      await this.page.click(inputSelector, { timeout: 5000 });
      await this.page.waitForTimeout(500);
      
      await this.page.fill(inputSelector, '');
      await this.page.waitForTimeout(300);
      
      await this.page.type(inputSelector, sanitizedMessage, { delay: 50, timeout: 30000 });
      await this.page.waitForTimeout(500);
      
      const sendButton = await this.findSendButton();
      if (sendButton) {
        await sendButton.click();
      } else {
        await this.page.keyboard.press('Enter');
      }
      
      console.log('[Browser] 消息已发送，等待 AI 回复...');
      
      await this.waitForResponse();
      
      const response = await this.extractLatestResponse();
      console.log('[Browser] 回复提取完成');
      
      return response;
    } catch (error) {
      console.error('[Browser] 处理消息失败:', error.message);
      
      if (error.message.includes('登录') || error.message.includes('session')) {
        this.isLoggedIn = false;
      }
      
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  async ensurePageReady() {
    try {
      const currentUrl = this.page.url();
      if (!currentUrl.includes('deepseek.com')) {
        await this.page.goto(DEEPSEEK_URL, { waitUntil: 'networkidle' });
      }
      
      const loginCheck = await this.checkLoginStatus();
      if (!loginCheck) {
        console.log('[Browser] 检测到登录状态失效，请重新登录');
        this.isLoggedIn = false;
        await this.waitForLogin();
      }
    } catch (error) {
      console.error('[Browser] 页面准备失败:', error.message);
      throw error;
    }
  }

  async findInputSelector() {
    const selectors = [
      'textarea[placeholder*="说点什么"]',
      'textarea[placeholder*="发送"]',
      'textarea[placeholder*="输入"]',
      'textarea',
      '[contenteditable="true"]',
      '.chat-input textarea',
      '#chat-input'
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          return selector;
        }
      }
    }

    throw new Error('找不到输入框');
  }

  async findSendButton() {
    const selectors = [
      'button[type="submit"]',
      'button[aria-label*="发送"]',
      'button:has-text("发送")',
      '.send-button',
      'button:has(svg)'
    ];

    for (const selector of selectors) {
      try {
        const button = await this.page.$(selector);
        if (button) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            return button;
          }
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  async waitForResponse() {
    const maxWaitTime = 60000;
    const startTime = Date.now();

    await this.page.waitForTimeout(2000);

    while (Date.now() - startTime < maxWaitTime) {
      const stopButtonSelectors = [
        'button[aria-label="停止生成"]',
        'button[aria-label*="停止"]',
        'button:has-text("停止生成")',
        '.stop-generating',
        '[data-testid="stop-button"]'
      ];

      let isGenerating = false;
      for (const selector of stopButtonSelectors) {
        try {
          const stopButton = await this.page.$(selector);
          if (stopButton && await stopButton.isVisible()) {
            isGenerating = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!isGenerating) {
        await this.page.waitForTimeout(1500);
        
        let stillGenerating = false;
        for (const selector of stopButtonSelectors) {
          try {
            const stopButton = await this.page.$(selector);
            if (stopButton && await stopButton.isVisible()) {
              stillGenerating = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (!stillGenerating) {
          console.log('[Browser] AI 回复完成');
          return;
        }
      }

      await this.page.waitForTimeout(1000);
      
      if (Date.now() - startTime > 30000 && (Date.now() - startTime) % 10000 < 1000) {
        console.log('[Browser] 仍在等待 AI 回复...');
      }
    }

    throw new Error('等待 AI 回复超时');
  }

  async extractLatestResponse() {
    const selectors = [
      '.ds-message:last-child',
      '.message:last-child',
      '[data-role="assistant"]:last-child',
      '.assistant-message:last-child',
      '.chat-message:last-child'
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const text = await element.innerText();
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }
      } catch (e) {
        continue;
      }
    }

    try {
      const allMessages = await this.page.$$('[class*="message"]');
      if (allMessages.length > 0) {
        const lastMessage = allMessages[allMessages.length - 1];
        const text = await lastMessage.innerText();
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch (e) {
      console.error('[Browser] 提取消息失败:', e.message);
    }

    throw new Error('无法提取 AI 回复内容');
  }

  async close() {
    console.log('[Browser] 正在关闭浏览器...');
    if (this.context) {
      await this.context.close();
    }
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
  }
}

module.exports = BrowserManager;
