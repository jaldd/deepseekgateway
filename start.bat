@echo off
chcp 65001 >nul
echo ========================================
echo   OpenClaw-Zero-Token 本地网关
echo ========================================

if not exist "node_modules" (
    echo [启动脚本] 正在安装依赖...
    call npm install
)

echo [启动脚本] 正在启动服务...
npm start
pause
