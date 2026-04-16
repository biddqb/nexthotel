@echo off
REM Install nextHotel to auto-start on Windows login.
REM Creates a shortcut in the current user's Startup folder.
REM Does NOT require admin rights. Uninstall via uninstall-autostart.cmd.
setlocal
cd /d "%~dp0"

set "EXE=%CD%\src-tauri\target\release\nexthotel-server.exe"
if not exist "%EXE%" (
  echo Binary not found: %EXE%
  echo Run build-release.cmd first.
  exit /b 1
)

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LNK=%STARTUP%\nextHotel.lnk"

powershell -NoProfile -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%LNK%');" ^
  "$s.TargetPath = '%EXE%';" ^
  "$s.WorkingDirectory = '%CD%';" ^
  "$s.WindowStyle = 7;" ^
  "$s.Description = 'nextHotel server';" ^
  "$s.Save()"

if errorlevel 1 (
  echo Failed to create shortcut.
  exit /b 1
)

echo.
echo =====================================================
echo Installed. nextHotel will start on next Windows login.
echo Shortcut: %LNK%
echo To start now: run the .exe or restart.
echo =====================================================
exit /b 0
