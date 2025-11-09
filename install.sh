#!/bin/bash

echo "================================================"
echo " Virtual Printer MCP Installer"
echo "================================================"
echo ""

# Get the directory where this script is located
INSTALL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Path to MCP settings
CLINE_SETTINGS="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
CLAUDE_SETTINGS="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# For Linux, adjust paths
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CLINE_SETTINGS="$HOME/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
    CLAUDE_SETTINGS="$HOME/.config/Claude/claude_desktop_config.json"
fi

echo "Installing from: $INSTALL_DIR"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org"
    echo ""
    exit 1
fi

echo "Node.js found: $(node --version)"
echo ""

# Function to add server to JSON config
add_to_config() {
    local config_file=$1
    local app_name=$2
    
    if [ -f "$config_file" ]; then
        echo "Configuring $app_name..."
        
        # Backup existing settings
        cp "$config_file" "$config_file.backup" 2>/dev/null
        
        # Use Python or Node to update JSON (more reliable than jq which might not be installed)
        if command -v python3 &> /dev/null; then
            python3 << EOF
import json
import sys

try:
    with open('$config_file', 'r') as f:
        config = json.load(f)
    
    if 'mcpServers' not in config:
        config['mcpServers'] = {}
    
    config['mcpServers']['virtual-printer'] = {
        'command': 'node',
        'args': ['$INSTALL_DIR/build/index.js'],
        'disabled': False,
        'autoApprove': []
    }
    
    with open('$config_file', 'w') as f:
        json.dump(config, f, indent=2)
    
    print('$app_name configuration updated successfully!')
    sys.exit(0)
except Exception as e:
    print(f'Error updating config: {e}')
    sys.exit(1)
EOF
            if [ $? -ne 0 ]; then
                echo ""
                echo "WARNING: Automatic configuration failed."
                return 1
            fi
        else
            # Fallback: show manual instructions
            echo "Python3 not found. Please add manually."
            return 1
        fi
        echo ""
        return 0
    else
        echo "$app_name settings not found. Skipping $app_name configuration."
        echo ""
        return 1
    fi
}

# Configure Cline
CLINE_CONFIGURED=false
if add_to_config "$CLINE_SETTINGS" "Cline (VSCode)"; then
    CLINE_CONFIGURED=true
fi

# Configure Claude Desktop
CLAUDE_CONFIGURED=false
if [ -f "$CLAUDE_SETTINGS" ] || [ -d "$(dirname "$CLAUDE_SETTINGS")" ]; then
    echo "Claude Desktop detected."
    read -p "Would you like to configure Claude Desktop as well? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Create config file if it doesn't exist
        if [ ! -f "$CLAUDE_SETTINGS" ]; then
            mkdir -p "$(dirname "$CLAUDE_SETTINGS")"
            echo '{"mcpServers":{}}' > "$CLAUDE_SETTINGS"
        fi
        if add_to_config "$CLAUDE_SETTINGS" "Claude Desktop"; then
            CLAUDE_CONFIGURED=true
        fi
    fi
fi

echo "================================================"
echo " Installation Complete!"
echo "================================================"
echo ""
echo "Virtual Printer MCP has been installed successfully!"
echo ""
echo "Location: $INSTALL_DIR"
echo ""
echo "Configured in:"
if [ "$CLINE_CONFIGURED" = true ]; then
    echo "  ✓ Cline (VSCode extension)"
fi
if [ "$CLAUDE_CONFIGURED" = true ]; then
    echo "  ✓ Claude Desktop"
fi
echo ""
echo "IMPORTANT: Please restart VSCode/Claude Desktop to see the changes."
echo ""
echo "Available printer tools:"
echo "  - print_document    - Submit a print job"
echo "  - get_status        - Check printer status"
echo "  - cancel_job        - Cancel a print job"
echo "  - refill_ink_cartridge - Refill ink"
echo "  - load_paper        - Load paper"
echo "  - And many more..."
echo ""

# Show manual config if auto-config failed
if [ "$CLINE_CONFIGURED" = false ] && [ "$CLAUDE_CONFIGURED" = false ]; then
    echo "================================================"
    echo " Manual Configuration Required"
    echo "================================================"
    echo ""
    echo "Add this to your MCP settings file:"
    echo ""
    echo "{"
    echo '  "mcpServers": {'
    echo '    "virtual-printer": {'
    echo '      "command": "node",'
    echo "      \"args\": [\"$INSTALL_DIR/build/index.js\"],"
    echo '      "disabled": false,'
    echo '      "autoApprove": []'
    echo "    }"
    echo "  }"
    echo "}"
    echo ""
    echo "Cline settings location:"
    echo "$CLINE_SETTINGS"
    echo ""
    echo "Claude Desktop settings location:"
    echo "$CLAUDE_SETTINGS"
    echo ""
fi

read -p "Press enter to continue..."
