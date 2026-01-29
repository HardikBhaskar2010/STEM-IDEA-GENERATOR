@echo off
echo ========================================
echo   STEM IDEA GENERATOR - GitHub Setup
echo ========================================
echo.
echo This script will help you push to your GitHub repository.
echo.
echo Please provide your GitHub information:
echo.

set /p USERNAME="Enter your GitHub username: "
set /p REPO_NAME="Enter your repository name (default: STEM-IDEA-GENERATOR): "

if "%REPO_NAME%"=="" set REPO_NAME=STEM-IDEA-GENERATOR

echo.
echo Setting up remote repository...
git remote remove origin
git remote add origin https://github.com/%USERNAME%/%REPO_NAME%.git

echo.
echo Checking remote configuration...
git remote -v

echo.
echo Pushing to GitHub...
echo Note: You may be prompted for your GitHub credentials
echo.

git push -u origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   SUCCESS! 
    echo ========================================
    echo.
    echo Your STEM Idea Generator has been pushed to:
    echo https://github.com/%USERNAME%/%REPO_NAME%
    echo.
    echo The following major updates were included:
    echo - Fixed 500 server errors
    echo - Implemented localStorage-based chat system  
    echo - Added stateless AI guidance service
    echo - OpenRouter AI integration working
    echo - Comprehensive testing tools
    echo.
    echo Your repository is now up to date!
) else (
    echo.
    echo ========================================
    echo   PUSH FAILED
    echo ========================================
    echo.
    echo Common solutions:
    echo 1. Make sure the repository exists on GitHub
    echo 2. Check your GitHub credentials
    echo 3. Ensure you have push access to the repository
    echo.
    echo Manual push command:
    echo git push -u origin master
)

echo.
pause