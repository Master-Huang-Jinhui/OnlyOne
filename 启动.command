#!/bin/bash
cd "$(dirname "$0")"

echo "========================================"
echo "  Only One 一站式管理系统"
echo "========================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js！"
    echo "请先安装 Node.js：https://nodejs.org"
    read -p "按回车键退出..."
    exit 1
fi

echo "[1/3] 检查依赖..."
if [ ! -d "backend/node_modules" ]; then
    echo "正在安装后端依赖..."
    cd backend
    npm install --production
    if [ $? -ne 0 ]; then
        echo "[错误] 后端依赖安装失败"
        read -p "按回车键退出..."
        exit 1
    fi
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "正在安装前端依赖..."
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 前端依赖安装失败"
        read -p "按回车键退出..."
        exit 1
    fi
    cd ..
fi

if [ ! -f "frontend/dist/index.html" ]; then
    echo "[2/3] 正在构建前端..."
    cd frontend
    npm run build
    if [ $? -ne 0 ]; then
        echo "[错误] 前端构建失败"
        read -p "按回车键退出..."
        exit 1
    fi
    cd ..
else
    echo "[2/3] 前端已构建，跳过"
fi

echo "[3/3] 启动服务..."
echo ""
echo "服务启动中，启动后将自动打开浏览器"
echo "按 Ctrl+C 可停止服务"
echo ""

(sleep 3 && open http://localhost:3000) &

cd backend
node src/server.js
