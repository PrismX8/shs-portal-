@echo off
echo ========================================
echo SHS Game Hall Backend - Installation
echo ========================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js is installed.
node --version
echo.

echo [2/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo Dependencies installed successfully.
echo.

echo [3/4] Setting up environment file...
if not exist .env (
    copy .env.example .env >nul
    echo Created .env file from .env.example
    echo Please edit .env file to configure your settings.
) else (
    echo .env file already exists, skipping...
)
echo.

echo [4/4] Initializing database...
call npm run init-db
if errorlevel 1 (
    echo ERROR: Failed to initialize database!
    pause
    exit /b 1
)
echo Database initialized successfully.
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit backend\.env file to configure settings
echo 2. Run "npm start" to start the server
echo 3. Or run "npm run dev" for development mode
echo.
pause

