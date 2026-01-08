@echo off
echo ========================================
echo    AGGIORNAMENTO DATI MCRANKING
echo ========================================
echo.
echo Scegli un'opzione:
echo 1. Aggiorna da file CSV esistente
echo 2. Scarica manualmente da Google Sheets
echo.
choice /c 12 /n /m "Scelta [1-2]: "

if errorlevel 2 goto manual
if errorlevel 1 goto auto

:auto
echo.
echo Elaborazione dati...
python update-from-sheet.py
goto end

:manual
echo.
echo ISTRUZIONI MANUALI:
echo 1. Vai al tuo Google Sheet
echo 2. File -> Scarica -> CSV
echo 3. Salva come 'risposte.csv' in questa cartella
echo 4. Riavvia questo script
pause
goto end

:end
echo.
echo Operazione completata!
echo Premi un tasto per uscire...
pause > nul