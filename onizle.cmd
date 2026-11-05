@echo off
rem Prototipi yerel olarak baslatir. Sisteme kurulum yapmaz.
rem Proje icinde tasinabilir Node varsa onu, yoksa sistemdeki Node'u kullanir.
cd /d "%~dp0"
if exist "%~dp0.tools\node\node.exe" set "PATH=%~dp0.tools\node;%PATH%"

where node >nul 2>nul
if errorlevel 1 goto :node_yok

call node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>=26||a===24||(a===22&&b>=12)?0:1)"
if errorlevel 1 goto :node_eski

if exist node_modules goto :baslat
echo Bagimliliklar yukleniyor...
call npm ci --no-fund --no-audit
if errorlevel 1 goto :kurulum_hatasi

:baslat
echo.
echo Tarayici otomatik acilacak. Adres asagida yazar.
echo Mobil cerceve icin adresin sonuna cihaz.html ekleyin.
echo Durdurmak icin bu pencereyi kapatin.
echo.
call npx vite --host 127.0.0.1 --port 5173 --open
goto :eof

:node_yok
echo.
echo Node.js bulunamadi.
echo Lutfen https://nodejs.org adresinden LTS surumunu kurup bu dosyayi yeniden calistirin.
echo.
pause
exit /b 1

:node_eski
echo.
echo Node.js surumu uygun degil. Gerekli surum: 22.12 ve sonrasi, 24 veya 26 ve sonrasi.
echo Lutfen https://nodejs.org adresinden LTS surumunu kurun.
echo.
pause
exit /b 1

:kurulum_hatasi
echo.
echo Bagimliliklar yuklenemedi. Internet baglantinizi kontrol edip yeniden deneyin.
echo.
pause
exit /b 1
