@echo off
echo ================================================
echo  Virtual Printer MCP Uninstaller
echo ================================================
echo.

set MCP_SETTINGS=%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
set CLAUDE_SETTINGS=%APPDATA%\Claude\claude_desktop_config.json

echo WARNING: This will remove Virtual Printer MCP from your system.
echo.
choice /C YN /M "Are you sure you want to continue"
if errorlevel 2 exit /b 0

echo.
echo Removing from Cline configuration...
if exist "%MCP_SETTINGS%" (
    REM Backup before modifying
    copy "%MCP_SETTINGS%" "%MCP_SETTINGS%.backup" >nul 2>&1
    
    REM Remove virtual-printer entry using PowerShell
    powershell -Command "$ErrorActionPreference='Stop'; try { $config = Get-Content '%MCP_SETTINGS%' -Raw | ConvertFrom-Json; if ($config.mcpServers -and $config.mcpServers.'virtual-printer') { $config.mcpServers.PSObject.Properties.Remove('virtual-printer'); $config | ConvertTo-Json -Depth 10 | Set-Content '%MCP_SETTINGS%' -Encoding UTF8; Write-Host 'Removed from Cline configuration' } else { Write-Host 'Not found in Cline configuration' } } catch { Write-Host 'Error:' $_.Exception.Message }"
) else (
    echo Cline settings not found.
)

echo.
echo Removing from Claude Desktop configuration...
if exist "%CLAUDE_SETTINGS%" (
    copy "%CLAUDE_SETTINGS%" "%CLAUDE_SETTINGS%.backup" >nul 2>&1
    
    powershell -Command "$ErrorActionPreference='Stop'; try { $config = Get-Content '%CLAUDE_SETTINGS%' -Raw | ConvertFrom-Json; if ($config.mcpServers -and $config.mcpServers.'virtual-printer') { $config.mcpServers.PSObject.Properties.Remove('virtual-printer'); $config | ConvertTo-Json -Depth 10 | Set-Content '%CLAUDE_SETTINGS%' -Encoding UTF8; Write-Host 'Removed from Claude Desktop configuration' } else { Write-Host 'Not found in Claude Desktop configuration' } } catch { Write-Host 'Error:' $_.Exception.Message }"
) else (
    echo Claude Desktop settings not found.
)

echo.
echo Removing printer state file...
if exist "%USERPROFILE%\.virtual-printer\printer-state.json" (
    del "%USERPROFILE%\.virtual-printer\printer-state.json"
    echo Printer state removed.
) else (
    echo No printer state found.
)

echo.
echo ================================================
echo  Uninstallation Complete
echo ================================================
echo.
echo Virtual Printer MCP has been removed from:
echo   - Cline (VSCode extension)
echo   - Claude Desktop
echo   - Printer state file
echo.
echo IMPORTANT: Please restart VSCode/Claude Desktop.
echo.
echo To completely remove, you can also delete this folder:
echo %~dp0
echo.
pause
