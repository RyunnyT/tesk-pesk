@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   TESK Desktop Widget Build
echo ============================================
echo.

echo [1/4] Cleaning old build...
if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"
if exist "widget.spec" del /q "widget.spec"
if exist "TeacherDashboard.spec" del /q "TeacherDashboard.spec"

echo [2/4] Clearing PyInstaller cache...
if exist "%APPDATA%\pyinstaller" rmdir /s /q "%APPDATA%\pyinstaller"

echo [3/4] Building exe (onedir mode - most stable)...
pyinstaller ^
  --onedir ^
  --windowed ^
  --noconfirm ^
  --name=TeacherDashboard ^
  --add-data "index.html;." ^
  --collect-all PyQt5 ^
  --collect-all PyQtWebEngine ^
  widget.py

echo [4/4] Done!
echo.
if exist "dist\TeacherDashboard\TeacherDashboard.exe" (
    echo SUCCESS: dist\TeacherDashboard\TeacherDashboard.exe
    echo.
    echo IMPORTANT: Run the exe from inside the TeacherDashboard folder.
    echo Do not move the exe file alone - it needs the DLLs next to it.
) else (
    echo FAILED: exe was not created. Check errors above.
)
echo ============================================
pause
