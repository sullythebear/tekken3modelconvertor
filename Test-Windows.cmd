@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\Start-Test.ps1" %*
set "T3CS_TEST_EXIT=%ERRORLEVEL%"
echo.
echo Test exit code: %T3CS_TEST_EXIT%
pause
exit /b %T3CS_TEST_EXIT%
