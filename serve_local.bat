@echo off
cd /d "%~dp0"
rem V92: force_server.py opens the browser only after it has successfully bound
rem port 8080. This prevents Chrome from racing ahead of the server or opening a
rem different app that already owns localhost:8080.
py force_server.py
if errorlevel 1 pause
