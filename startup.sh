#!/bin/bash

# Script de inicialização para Azure App Service
# Este script garante que o Node.js inicie corretamente

echo "Iniciando aplicação Barcoders..."
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"

# Lista arquivos para debug
echo "Listando estrutura de diretórios:"
ls -la

# Inicia o servidor
echo "Iniciando servidor Node.js..."
node backend/server.js
