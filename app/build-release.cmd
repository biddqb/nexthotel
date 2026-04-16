@echo off
REM Build a single-binary release of nextHotel.
REM Output: src-tauri\target\release\nexthotel-server.exe
setlocal
cd /d "%~dp0"

echo [1/2] Building frontend...
call bun install
if errorlevel 1 goto :err
call bun run build
if errorlevel 1 goto :err

echo [2/2] Building Rust release binary (first run takes 5-10 minutes)...
cd src-tauri
cargo build --release
if errorlevel 1 goto :err
cd ..

echo.
echo =====================================================
echo Build complete.
echo Binary: src-tauri\target\release\nexthotel-server.exe
echo Run it, then open http://localhost:8080 in a browser.
echo =====================================================
exit /b 0

:err
echo.
echo BUILD FAILED.
exit /b 1
