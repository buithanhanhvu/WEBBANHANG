@echo off
echo [1/2] Killing process on port 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Killed PID %%a
)
timeout /t 2 /nobreak >nul
echo [2/2] Starting Spring Boot...
call mvnw.cmd spring-boot:run
