#!/bin/bash

echo "========================================"
echo "  OpenClaw-Zero-Token 本地网关"
echo "========================================"

if [ ! -d "node_modules" ]; then
    echo "[启动脚本] 正在安装依赖..."
    npm install
fi

echo "[启动脚本] 正在启动服务..."
node server.js
