@echo off
title CONEQUIPOS - Sistema de Entrada y Agente Lector

echo ==========================================
echo   1. Iniciando Servidor Web CONEQUIPOS...
echo ==========================================
start "Servidor Web" /d "C:\Proyectos\sistema-gestion-entrada" cmd /k "npm start"

echo Esperando a que el servidor inicialice puerto 3000...
timeout /t 3 /nobreak > nul

echo ==========================================
echo   2. Iniciando Agente Lector de Cedulas...
echo ==========================================
start "Agente Lector" /d "C:\Proyectos\agente-lector-cedulas" cmd /k "node agente.js"

echo ==========================================
echo   Todo en marcha correctamente.
echo ==========================================
exit