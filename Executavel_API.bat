@echo off
title API Vendas + Ngrok

echo Iniciando API Vendas...

cd /d "C:\Users\Willian - ZaraGestão\Documents\API_Vendas"

start "API Vendas - npm start" powershell -NoExit -Command "npm.cmd start"

timeout /t 3 /nobreak >nul

start "Ngrok - Porta 3000" powershell -NoExit -Command "ngrok http 3000"

echo API Iniciada
timeout /t 5

exit