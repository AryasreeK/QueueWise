@echo off
title QueueWise
echo Starting QueueWise frontend and backend...
call npm install
if errorlevel 1 goto error
call npm run install:all
if errorlevel 1 goto error
call npm run dev
goto end
:error
echo.
echo Installation failed. Check the terminal output and README.md.
pause
:end
