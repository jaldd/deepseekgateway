@echo off
echo 正在配置 Trae AI 设置...

set OPENAI_API_KEY=local
set OPENAI_BASE_URL=http://localhost:9083/v1
set OPENAI_MODEL_NAME=deepseek-chat

echo 配置完成！
echo API 端点: http://localhost:9083/v1
echo 模型: deepseek-chat
echo.
echo 现在可以启动 Trae IDE 了
pause