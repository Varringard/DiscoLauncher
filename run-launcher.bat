@echo off
title DiscoLauncher
cd /d "%~dp0"
echo Starting DiscoLauncher...
call npx.cmd electron .
pause
