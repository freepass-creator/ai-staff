@echo off
chcp 65001 >nul
if "%~1"=="" (
 echo Drag a .webm file onto this .bat file.
 pause
 exit /b 1
)
where ffmpeg >nul 2>nul
if errorlevel 1 (
 echo FFmpeg executable not found in PATH. Install FFmpeg first.
 pause
 exit /b 1
)
ffmpeg -y -i "%~1" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "%~dpn1.mp4"
if errorlevel 1 echo Conversion failed.
pause
