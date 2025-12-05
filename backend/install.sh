#!/bin/bash

echo "========================================"
echo "SHS Game Hall Backend - Installation"
echo "========================================"
echo ""

echo "[1/4] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "Node.js is installed."
node --version
echo ""

echo "[2/4] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies!"
    exit 1
fi
echo "Dependencies installed successfully."
echo ""

echo "[3/4] Setting up environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
    echo "Please edit .env file to configure your settings."
else
    echo ".env file already exists, skipping..."
fi
echo ""

echo "[4/4] Initializing database..."
npm run init-db
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to initialize database!"
    exit 1
fi
echo "Database initialized successfully."
echo ""

echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env file to configure settings"
echo "2. Run 'npm start' to start the server"
echo "3. Or run 'npm run dev' for development mode"
echo ""

