@echo off
chcp 65001 >nul
title Configurando Hikvision para Microsoft Edge IE Mode...

:: =========================================================
:: COLORES
:: =========================================================

color 0F

:: =========================================================
:: VERIFICAR ADMINISTRADOR
:: =========================================================

net session >nul 2>&1
if errorlevel 1 (
    color 0C
    cls
    echo.
    echo ============================================================
    echo            EJECUTA ESTE ARCHIVO COMO ADMINISTRADOR
    echo ============================================================
    echo.
    pause
    exit /b 1
)

cls

echo.
echo ============================================================
echo.
echo        H I K V I S I O N    C O N F I G U R A D O R
echo.
echo ============================================================
echo.

:: =========================================================
:: CREAR CARPETA
:: =========================================================

if not exist "C:\Windows\System32\hikvision" (
    mkdir "C:\Windows\System32\hikvision"
)

:: =========================================================
:: ELIMINAR XML ANTERIOR
:: =========================================================

del /f /q "C:\Windows\System32\hikvision\sitelist.xml" >nul 2>&1

echo [1/6] Generando lista de sitios IE Mode...
echo.

set "TMP_PS=%TEMP%\hik_fix.ps1"

(
echo $xml = '<?xml version="1.0" encoding="utf-8"?>'
echo $xml += "`n<site-list version=`"205`">"

echo $xml += "`n  <site url=`"http://190.117.59.178:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://38.250.129.28:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://181.224.227.46:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://38.19.146.152:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://167.250.206.154:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://38.19.151.164:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://38.187.9.8:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://168.194.101.23:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://201.230.15.35:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://190.117.59.228:9000`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://209.45.83.213:2200`"><open-in>IE11</open-in></site>"
echo $xml += "`n  <site url=`"http://209.61.72.152:2200`"><open-in>IE11</open-in></site>"


echo $xml += "`n</site-list>"

echo $bytes = [System.Text.Encoding]::UTF8.GetBytes($xml^)
echo [System.IO.File]::WriteAllBytes('C:\Windows\System32\hikvision\sitelist.xml', $bytes^)

echo Write-Host "XML generado correctamente."
) > "%TMP_PS%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%TMP_PS%"
del /f /q "%TMP_PS%" >nul 2>&1

:: =========================================================
:: EDGE IE MODE
:: =========================================================

echo [2/6] Configurando Microsoft Edge IE Mode...
echo.

reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v InternetExplorerIntegrationLevel /t REG_DWORD /d 1 /f >nul

reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v InternetExplorerIntegrationSiteList /t REG_SZ /d "file:///C:/Windows/System32/hikvision/sitelist.xml" /f >nul

reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v InternetExplorerIntegrationReloadInIEModeAllowed /t REG_DWORD /d 1 /f >nul

:: =========================================================
:: SITIOS DE CONFIANZA
:: =========================================================

echo [3/6] Configurando sitios de confianza...
echo.

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\190.117.59.178" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\38.250.129.28" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\181.224.227.46" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\38.19.146.152" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\167.250.206.154" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\38.19.151.164" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\38.187.9.8" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\168.194.101.23" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\201.230.15.35" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\190.117.59.228" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\209.45.83.213" /v http /t REG_DWORD /d 2 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\209.61.72.152" /v http /t REG_DWORD /d 2 /f >nul


:: =========================================================
:: ACTIVEX
:: =========================================================

echo [4/6] Configurando compatibilidad ActiveX...
echo.

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\2" /v 1200 /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\2" /v 1201 /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\2" /v 1206 /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\2" /v 1405 /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\2" /v 1609 /t REG_DWORD /d 0 /f >nul

:: =========================================================
:: ACTUALIZAR POLITICAS
:: =========================================================

echo [5/6] Aplicando configuraciones...
echo.

gpupdate /force >nul 2>&1

:: =========================================================
:: CERRAR EDGE
:: =========================================================

echo [6/6] Reiniciando Microsoft Edge...
echo.

taskkill /f /im msedge.exe >nul 2>&1

timeout /t 2 /nobreak >nul

:: =========================================================
:: ABRIR EDGE
:: =========================================================

set "EDGE32=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "EDGE64=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if exist "%EDGE64%" (
    start "" "%EDGE64%" --new-window "http://190.117.59.178:9000"
    goto :FIN
)

if exist "%EDGE32%" (
    start "" "%EDGE32%" --new-window "http://190.117.59.178:9000"
    goto :FIN
)

echo No se encontro Microsoft Edge.

:FIN

cls
color 0F

echo.
echo ============================================================
echo.
echo        H I K V I S I O N    C O N F I G U R A D O R
echo.
echo ============================================================
echo.
echo              STATUS: CONFIGURACION COMPLETADA
echo.
echo ============================================================
echo.
echo        Todo configurado correctamente.
echo        Ahora podras visualizar las camaras normalmente :D
echo.

color 0D

echo.
echo                     ======================
echo                         Fabritcio PS
echo                     ======================
echo.

color 0F

echo ============================================================
echo.

pause