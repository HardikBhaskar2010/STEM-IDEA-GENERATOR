@echo off
echo ========================================
echo   RESTARTING BACKEND SERVER
echo ========================================
echo.
echo Stopping any existing backend servers...
taskkill /f /im python.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting fresh backend server with fixes...
echo Server will start on: http://localhost:8001
echo.
echo The following issues have been fixed:
echo - ✅ /guidance/context endpoint (was 500, now 200)
echo - ✅ /projects/sync endpoint (graceful handling)
echo - ✅ /guidance/chat endpoint (already working)
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

pause