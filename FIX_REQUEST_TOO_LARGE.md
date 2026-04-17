# 解决 Claude Code "Request too large" 错误

## 问题原因

错误 "Request too large (max 32MB)" 通常由以下原因导致：

1. **工作目录文件过多** - 当前目录包含大量文件
2. **上下文过大** - Claude Code 尝试包含太多文件作为上下文
3. **大文件** - 目录中包含大文件（如二进制文件、日志等）

## 解决方案

### 方案一：切换到项目目录

建议在项目根目录运行：

```bash
# 切换到您的项目目录
cd your-project-directory

# 然后运行 claude
claude
```

### 方案二：创建 .claudeignore 文件

在项目根目录创建 `.claudeignore` 文件，排除不需要的文件：

```
# 忽略 node_modules
node_modules/

# 忽略大文件
*.log
*.zip
*.tar.gz
*.rar

# 忽略构建产物
dist/
build/
out/

# 忽略 IDE 文件
.idea/
.vscode/
*.iml

# 忽略系统文件
.DS_Store
Thumbs.db

# 忽略 Git
.git/

# 忽略临时文件
tmp/
temp/
*.tmp
```

### 方案三：使用 /compact 命令

在 Claude Code 中使用 `/compact` 命令清理上下文：

```
/compact
```

### 方案四：限制上下文大小

修改配置文件，添加上下文限制：

```json
{
  "apiProvider": "anthropic",
  "apiBaseUrl": "http://localhost:9083/v1",
  "apiKey": "local",
  "model": "claude-3-opus-20240229",
  "maxTokens": 4096,
  "temperature": 0.7,
  "stream": true,
  "contextLimit": {
    "maxFileSize": 1048576,
    "maxTotalSize": 10485760,
    "excludePatterns": [
      "node_modules/**",
      "*.log",
      "*.zip",
      ".git/**",
      "dist/**",
      "build/**"
    ]
  }
}
```

### 方案五：使用 /init 重新初始化

在 Claude Code 中运行：

```
/init
```

这会创建一个新的 CLAUDE.md 文件，帮助 Claude Code 更好地理解项目。

## 最佳实践

### 1. 在正确的目录运行

```bash
# 在项目根目录运行
cd your-project-directory
claude
```

### 2. 定期清理上下文

```
/compact
```

### 3. 使用 .claudeignore

创建 `.claudeignore` 文件，类似于 `.gitignore`

### 4. 避免大文件

不要在包含以下文件的目录运行：
- `node_modules/`
- 大型二进制文件
- 日志文件
- 构建产物

## 快速修复

### 立即解决

1. **退出当前 Claude Code**
   ```
   /exit
   ```

2. **切换到项目目录**
   ```bash
   cd your-project-directory
   ```

3. **创建 .claudeignore**
   ```bash
   # 创建 .claudeignore 文件
   echo "node_modules/" > .claudeignore
   echo "*.log" >> .claudeignore
   echo ".git/" >> .claudeignore
   ```

4. **重新启动 Claude Code**
   ```bash
   claude
   ```

### 验证配置

```bash
# 检查当前目录
pwd

# 列出文件大小
du -sh *

# 检查大文件
find . -type f -size +10M
```

## 配置示例

### 完整的 .claudeignore 示例

```
# Dependencies
node_modules/
vendor/
.pnpm-store/

# Build outputs
dist/
build/
out/
target/
*.o
*.exe
*.dll

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Large files
*.zip
*.tar.gz
*.rar
*.7z
*.iso

# Media
*.mp4
*.avi
*.mov
*.mp3
*.wav

# Documents
*.pdf
*.doc
*.docx

# Temporary
tmp/
temp/
*.tmp
*.bak
```

## 常见问题

### Q: 为什么会出现这个错误？

A: Claude Code 会尝试将当前目录的文件作为上下文发送，如果目录文件过多或过大，就会超过 32MB 限制。

### Q: 如何查看当前上下文大小？

A: 在 Claude Code 中使用 `/context` 命令查看当前上下文。

### Q: 如何只发送特定文件？

A: 使用 `/add filename` 命令添加特定文件到上下文。

### Q: 如何清除所有上下文？

A: 使用 `/clear` 命令清除所有上下文。

## 相关命令

- `/compact` - 压缩上下文
- `/clear` - 清除上下文
- `/context` - 查看上下文
- `/add <file>` - 添加文件
- `/remove <file>` - 移除文件
- `/init` - 初始化项目
- `/help` - 查看帮助
