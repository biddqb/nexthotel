@echo off
setlocal
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\nextHotel.lnk"
if exist "%LNK%" (
  del "%LNK%"
  echo Removed auto-start shortcut.
) else (
  echo No auto-start shortcut found.
)
exit /b 0
