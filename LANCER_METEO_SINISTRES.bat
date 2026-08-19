@echo off
title Meteo Climat PRO - Sinistres & Assurances
cd /d "%~dp0"
echo =====================================================================
echo    METEO CLIMAT PRO - EXPERTISE SINISTRES ET RAPPORTS METEOROLOGIQUES
echo =====================================================================
echo.
echo Lancement du serveur local sur http://localhost:3000 ...
echo.
start http://localhost:3000
npm run dev -- --port 3000
pause
