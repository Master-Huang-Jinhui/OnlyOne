@echo off
chcp 65001 >nul
title Only One 一站式管理系统

echo ========================================
echo   Only One 一站式管理系统
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js！
    echo 请先安装 Node.js：https://nodejs.org
    pause
    exit /b 1
)

echo [1/3] 检查依赖...
if not exist "backend\node_modules" (
    echo 正在安装后端依赖...
    cd /d "%~dp0backend"
    call npm install --production
    if %errorlevel% neq 0 (
        echo [错误] 后端依赖安装失败
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

if not exist "frontend\node_modules" (
    echo 正在安装前端依赖...
    cd /d "%~dp0frontend"
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

if not exist "frontend\dist\index.html" (
    echo [2/3] 正在构建前端...
    cd /d "%~dp0frontend"
    call npm run build
    if %errorlevel% neq 0 (
        echo [错误] 前端构建失败
        pause
        exit /b 1
    )
    cd /d "%~dp0"
) else (
    echo [2/3] 前端已构建，跳过
)

echo [3/3] 启动服务...
echo.
echo 服务启动中，启动后将自动打开浏览器
echo 按 Ctrl+C 可停止服务
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

cd /d "%~dp0backend"
node src/server.js

pause
