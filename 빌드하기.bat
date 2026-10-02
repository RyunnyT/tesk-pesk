@echo off
setlocal
cd /d "%~dp0"

set "APP_NAME=TeacherDashboard"
set "APP_ENTRY=widget.py"
set "DIST_DIR=dist\%APP_NAME%"
set "EXE_PATH=%DIST_DIR%\%APP_NAME%.exe"
set "ZIP_PATH=dist\%APP_NAME%-win64.zip"

echo ==========================================
echo   TeacherDashboard EXE Build + Package
echo ==========================================
echo.

if not exist "%APP_ENTRY%" (
    echo [ERROR] %APP_ENTRY% not found.
    pause
    exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] python command not found.
    echo Install Python 3.11+ and retry.
    pause
    exit /b 1
)

echo [1/4] Checking build dependencies...
python -m pip show pyinstaller >nul 2>nul
if errorlevel 1 (
    echo Installing pyinstaller, PyQt5, PyQtWebEngine...
    python -m pip install --upgrade pyinstaller PyQt5 PyQtWebEngine
    if errorlevel 1 (
        echo [ERROR] dependency install failed.
        pause
        exit /b 1
    )
)

echo [2/4] Cleaning old outputs...
if exist "build" rmdir /s /q "build"
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
if exist "dist\%APP_NAME%.exe" del /q "dist\%APP_NAME%.exe"
if exist "widget.spec" del /q "widget.spec"
if exist "%APP_NAME%.spec" del /q "%APP_NAME%.spec"

echo [3/4] Building onedir executable...
python -m PyInstaller ^
  --onedir ^
  --windowed ^
  --noconfirm ^
  --name "%APP_NAME%" ^
  --add-data "index.html;." ^
  --collect-all PyQt5 ^
  %APP_ENTRY%

if errorlevel 1 (
    echo [ERROR] build failed.
    pause
    exit /b 1
)

if not exist "%EXE_PATH%" (
    echo [ERROR] build finished but exe not found: %EXE_PATH%
    pause
    exit /b 1
)

echo [4/4] Creating deployment zip...
if exist "%ZIP_PATH%" del /q "%ZIP_PATH%"
powershell -NoProfile -Command "Compress-Archive -Path '%DIST_DIR%\*' -DestinationPath '%ZIP_PATH%' -Force"
if errorlevel 1 (
    echo [ERROR] zip packaging failed.
    pause
    exit /b 1
)

echo.
echo SUCCESS
echo Exe : %EXE_PATH%
echo Zip : %ZIP_PATH%
echo.
echo IMPORTANT: Distribute the entire folder (or the zip), not exe alone.
pause
exit /b 0
