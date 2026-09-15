@echo off
cd /d "%~dp0"
wscript //nologo "%~dp0YURT.vbs"
if errorlevel 1 (
  echo YURT acilamadi.
  pause
)
