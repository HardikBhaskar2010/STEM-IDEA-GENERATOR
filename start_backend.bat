@echo off
echo ========================================
echo   STEM IDEA GENERATOR - Backend Server
echo ========================================
echo.
echo Starting the fixed backend server...
echo This will resolve the 500 errors you're seeing.
echo.
echo Server will start on: http://localhost:8001
echo API endpoints will be: http://localhost:8001/api
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

pause