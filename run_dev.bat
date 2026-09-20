@echo off
title ZERO-DAY PROTOCOL Launcher
cls

:: 0. Control de visibilidad del terminal basado en dev_mode.txt
if "%1"=="hidden" goto :init
if not exist "dev_mode.txt" (
    echo false> dev_mode.txt
)
set /p DEV_MODE=<dev_mode.txt
set DEV_MODE=%DEV_MODE: =%

if not "%DEV_MODE%"=="false" goto :init
echo [LAUNCH] Iniciando Zero-Day Protocol en modo silencioso...
powershell -Command "Start-Process cmd.exe -ArgumentList '/c ""%~dpnx0"" hidden' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
exit /b

:init
echo ==================================================
echo         ZERO-DAY PROTOCOL - RUNTIME SYSTEM       
echo ==================================================
echo.

:: 1. Limpieza de cache de Electron y Vite para evitar fricciones de CSS/Assets
echo [SYSTEM CHECK] Limpiando cache de Electron y Vite...
if exist "%APPDATA%\project_a" rd /s /q "%APPDATA%\project_a"
if exist "%APPDATA%\zero_day_protocol\Cache" rd /s /q "%APPDATA%\zero_day_protocol\Cache"
if exist "%APPDATA%\zero_day_protocol\Code Cache" rd /s /q "%APPDATA%\zero_day_protocol\Code Cache"
if exist "%APPDATA%\zero_day_protocol\GPUCache" rd /s /q "%APPDATA%\zero_day_protocol\GPUCache"
if exist "node_modules\.vite" rd /s /q "node_modules\.vite"
echo [SYSTEM CHECK] Cache del sistema limpiado con exito.
echo.

:: 2. Verificar Python
echo [SYSTEM CHECK] Verificando instalacion de Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta instalado o no se encuentra en el PATH.
    echo Por favor, instala Python y vuelve a intentarlo.
    pause
    exit /b 1
)
echo [SYSTEM CHECK] Python detectado correctamente.

:: 2. Configurar entorno virtual (.venv) y dependencias de Python
if not exist ".venv" goto create_venv

:: Detectar cambio de ubicación de la carpeta para evitar fricción con rutas absolutas de Python/Pip
if not exist ".venv\.venv_path.txt" goto recreate_venv
set /p SAVED_PATH=<.venv\.venv_path.txt
set SAVED_PATH=%SAVED_PATH: =%
set CURRENT_PATH=%CD: =%

if "%SAVED_PATH%"=="%CURRENT_PATH%" goto venv_exists

:recreate_venv
echo [SYSTEM CHECK] Se ha detectado un cambio de ubicacion o nombre del proyecto.
echo [SYSTEM CHECK] Recreando el entorno virtual (.venv) para corregir rutas absolutas...
rd /s /q ".venv" >nul 2>&1

:create_venv
echo [SYSTEM CHECK] Creando entorno virtual de Python (.venv)...
python -m venv .venv
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo crear el entorno virtual.
    pause
    exit /b 1
)
echo %CD%>.venv\.venv_path.txt
echo [SYSTEM CHECK] Entorno virtual creado exitosamente.

echo [SYSTEM CHECK] Instalando requisitos del backend (modo offline)...
if exist "%~dp0vendor\wheels" (
    echo [SYSTEM CHECK] Modo OFFLINE: Instalando dependencias desde vendor\wheels...
    call "%~dp0.venv\Scripts\python" -m pip install --no-index --find-links="%~dp0vendor\wheels" -r "%~dp0backend\requirements.txt"
) else (
    call "%~dp0.venv\Scripts\python" -m pip install -r "%~dp0backend\requirements.txt"
)
if %errorlevel% neq 0 (
    echo [ERROR] Error instalando dependencias de Python.
    pause
    exit /b 1
)
echo [SYSTEM CHECK] Dependencias de Python listas.
:venv_exists

:: 3. Verificar dependencias de Node.js
if exist "node_modules" goto node_modules_exists
echo [SYSTEM CHECK] No se encontro node_modules. Instalando dependencias de npm...
call npm install
:node_modules_exists

echo.
echo ==================================================
echo             INICIANDO SERVICIOS DE JUEGO         
echo ==================================================
echo.
echo [API STATE]     Iniciando servidor local FastAPI...
echo [API STATE]     Endpoint: http://127.0.0.1:8000
echo [API STATE]     Docs:     http://127.0.0.1:8000/docs
echo [DATABASE STATE] SQLite base cargando...
echo.

:: Levantar FastAPI y Vite de inmediato en segundo plano
start "Zero-Day Protocol Backend" /B .venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
echo [ELECTRON DEV] Iniciando frontend de Vite en segundo plano...
start "Zero-Day Protocol Frontend" /B cmd /c "npm run dev"

echo [ELECTRON DEV] Iniciando wrapper de escritorio Electron de inmediato...
echo [ELECTRON DEV] Servidor de desarrollo: http://localhost:3000
echo.
echo [INFO] Zero-Day Protocol se ejecuta de manera 100%% offline con dependencias locales.
echo [INFO] Cierra la ventana del juego o presiona Ctrl+C en esta consola para salir.
echo ==================================================
echo.

:: Lanzar Electron en primer plano
call npm run electron

echo [CLEANUP] Cerrando servidores locales...
:: Matar de forma quirurgica los procesos escuchando en puertos 8000 (FastAPI) y 3000 (Vite)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [CLEANUP] Procesos cerrados correctamente.
exit
