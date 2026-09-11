@echo off
chcp 65001 >nul
title OnlyOne 一键启动
echo ========================================
echo   OnlyOne BBQ ^& Tea 一键启动 (Windows)
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 22 LTS
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo.

echo [2/5] 拉取最新代码...
git pull
if errorlevel 1 (
    echo [警告] git pull 失败，继续使用本地代码...
)
echo.

echo [3/5] 安装前端依赖...
cd frontend
if not exist node_modules (
    echo 首次运行，正在安装依赖，请稍候...
    call npm install
    if errorlevel 1 (
        echo [错误] 前端依赖安装失败！
        pause
        exit /b 1
    )
)
echo 前端依赖已就绪
echo.

echo [4/5] 构建前端...
call npm run build
if errorlevel 1 (
    echo [错误] 前端构建失败！
    pause
    exit /b 1
)
echo 前端构建成功
cd ..
echo.

echo [5/5] 安装后端依赖并启动...
cd backend
if not exist node_modules (
    echo 首次运行，正在安装后端依赖，请稍候...
    call npm install
    if errorlevel 1 (
        echo [错误] 后端依赖安装失败！
        pause
        exit /b 1
    )
)
echo 后端依赖已就绪
echo.
echo ========================================
echo   启动成功！
echo   访问地址: http://localhost:3000
echo   管理员账号: admin / admin
echo   按 Ctrl+C 停止服务
echo ========================================
echo.

node src/server.js

echo.
echo 服务已停止
pause
