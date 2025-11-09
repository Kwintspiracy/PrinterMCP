@echo off
echo ================================================
echo  Virtual Printer MCP Installer
echo ================================================
echo.

REM Get current directory (remove trailing backslash)
set INSTALL_DIR=%~dp0
set INSTALL_DIR=%INSTALL_DIR:~0,-1%

REM Path to MCP settings
set MCP_SETTINGS=%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
set CLAUDE_SETTINGS=%APPDATA%\Claude\claude_desktop_config.json

echo Installing from: %INSTALL_DIR%
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

REM Check if MCP settings file exists
if exist "%MCP_SETTINGS%" (
    echo Configuring Cline (VSCode)...
    
    REM Backup existing settings
    copy "%MCP_SETTINGS%" "%MCP_SETTINGS%.backup" >nul 2>&1
    
    REM Add to MCP settings using PowerShell
    powershell -Command "$ErrorActionPreference='Stop'; try { $config = Get-Content '%MCP_SETTINGS%' -Raw | ConvertFrom-Json; if (-not $config.mcpServers) { $config | Add-Member -NotePropertyName mcpServers -NotePropertyValue @{} }; $config.mcpServers.'virtual-printer' = @{ command = 'node'; args = @('%INSTALL_DIR%\build\index.js'); disabled = $false; autoApprove = @() }; $config | ConvertTo-Json -Depth 10 | Set-Content '%MCP_SETTINGS%' -Encoding UTF8; Write-Host 'Cline configuration updated successfully!' } catch { Write-Host 'Error updating Cline config:' $_.Exception.Message; exit 1 }"
    
    if errorlevel 1 (
        echo.
        echo WARNING: Automatic configuration failed.
        echo You'll need to manually add the server to your MCP settings.
        goto :manual_config
    )
    echo.
) else (
    echo Cline settings not found. Skipping Cline configuration.
    echo.
)

REM Check for Claude Desktop
if exist "%CLAUDE_SETTINGS%" (
    echo Claude Desktop settings detected.
    echo.
    choice /C YN /M "Would you like to configure Claude Desktop as well"
    if errorlevel 2 goto :skip_claude
    if errorlevel 1 (
        copy "%CLAUDE_SETTINGS%" "%CLAUDE_SETTINGS%.backup" >nul 2>&1
        powershell -Command "$ErrorActionPreference='Stop'; try { $config = if (Test-Path '%CLAUDE_SETTINGS%') { Get-Content '%CLAUDE_SETTINGS%' -Raw | ConvertFrom-Json } else { @{} }; if (-not $config.mcpServers) { $config | Add-Member -NotePropertyName mcpServers -NotePropertyValue @{} }; $config.mcpServers.'virtual-printer' = @{ command = 'node'; args = @('%INSTALL_DIR%\build\index.js') }; $config | ConvertTo-Json -Depth 10 | Set-Content '%CLAUDE_SETTINGS%' -Encoding UTF8; Write-Host 'Claude Desktop configuration updated!' } catch { Write-Host 'Error:' $_.Exception.Message; exit 1 }"
        echo.
    )
) else (
    echo Claude Desktop settings not found. Skipping Claude configuration.
    echo.
)
:skip_claude

echo ================================================
echo  Installation Complete!
echo ================================================
echo.
echo Virtual Printer MCP has been installed successfully!
echo.
echo Location: %INSTALL_DIR%
echo.
echo Configured in:
if exist "%MCP_SETTINGS%" echo   - Cline (VSCode extension)
if exist "%CLAUDE_SETTINGS%" echo   - Claude Desktop
echo.
echo IMPORTANT: Please restart VSCode/Claude Desktop to see the changes.
echo.
echo Available printer tools:
echo   - print_document    - Submit a print job
echo   - get_status        - Check printer status
echo   - cancel_job        - Cancel a print job
echo   - refill_ink_cartridge - Refill ink
echo   - load_paper        - Load paper
echo   - And many more...
echo.
goto :end

:manual_config
echo.
echo ================================================
echo Manual Configuration Required
echo ================================================
echo.
echo Add this to your MCP settings file:
echo Location: %MCP_SETTINGS%
echo.
echo {
echo   "mcpServers": {
echo     "virtual-printer": {
echo       "command": "node",
echo       "args": ["%INSTALL_DIR%\\build\\index.js"],
echo       "disabled": false,
echo       "autoApprove": []
echo     }
echo   }
echo }
echo.

:end
pause
