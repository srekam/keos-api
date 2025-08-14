#!/bin/bash

# ============================
#  MQTT Configuration Manager
# ============================
# This script safely manages MQTT configuration for the Hotel Management System
# Usage: ./mqtt-config.sh [command] [options]

CONFIG_FILE="config/mqtt-config.json"
BACKUP_DIR="config/backups"
LOG_FILE="logs/mqtt-config.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Show help
show_help() {
    echo -e "${BLUE}MQTT Configuration Manager${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status          - Show current MQTT configuration"
    echo "  backup          - Create backup of current configuration"
    echo "  restore [file]  - Restore configuration from backup"
    echo "  update          - Update MQTT configuration interactively"
    echo "  test            - Test MQTT connection"
    echo "  reset           - Reset to default configuration"
    echo "  validate        - Validate configuration file"
    echo "  help            - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 update"
    echo "  $0 test"
    echo "  $0 backup"
    echo "  $0 restore config/backups/mqtt-config-2024-01-27.json"
}

# Check if config file exists
check_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}Error: Configuration file not found: $CONFIG_FILE${NC}"
        exit 1
    fi
}

# Validate JSON configuration
validate_config() {
    if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
        echo -e "${RED}Error: Invalid JSON configuration${NC}"
        return 1
    fi
    
    # Check required fields
    local required_fields=("host" "port" "username" "password")
    for field in "${required_fields[@]}"; do
        if ! jq -e ".mqtt.$field" "$CONFIG_FILE" >/dev/null 2>&1; then
            echo -e "${RED}Error: Missing required field: mqtt.$field${NC}"
            return 1
        fi
    done
    
    echo -e "${GREEN}Configuration is valid${NC}"
    return 0
}

# Show current configuration
show_status() {
    check_config
    
    echo -e "${BLUE}Current MQTT Configuration:${NC}"
    echo ""
    
    # Show basic MQTT settings
    echo -e "${YELLOW}MQTT Broker:${NC}"
    echo "  Host: $(jq -r '.mqtt.host' "$CONFIG_FILE")"
    echo "  Port: $(jq -r '.mqtt.port' "$CONFIG_FILE")"
    echo "  Username: $(jq -r '.mqtt.username' "$CONFIG_FILE")"
    echo "  Client ID: $(jq -r '.mqtt.clientId' "$CONFIG_FILE")"
    echo ""
    
    # Show topic structure
    echo -e "${YELLOW}Topic Structure:${NC}"
    echo "  Prefix: $(jq -r '.topics.prefix' "$CONFIG_FILE")"
    echo "  Device Commands: $(jq -r '.topics.device.command' "$CONFIG_FILE")"
    echo "  WiFi Config: $(jq -r '.topics.wifi.config' "$CONFIG_FILE")"
    echo "  Notifications: $(jq -r '.topics.notification.system' "$CONFIG_FILE")"
    echo ""
    
    # Show QoS settings
    echo -e "${YELLOW}QoS Settings:${NC}"
    echo "  Default: $(jq -r '.qos.default' "$CONFIG_FILE")"
    echo "  Device Commands: $(jq -r '.qos.device_commands' "$CONFIG_FILE")"
    echo "  Notifications: $(jq -r '.qos.notifications' "$CONFIG_FILE")"
    echo ""
    
    # Validate configuration
    echo -e "${YELLOW}Validation:${NC}"
    if validate_config; then
        echo -e "${GREEN}✓ Configuration is valid${NC}"
    else
        echo -e "${RED}✗ Configuration has errors${NC}"
    fi
}

# Create backup
create_backup() {
    check_config
    
    local timestamp=$(date '+%Y-%m-%d_%H-%M-%S')
    local backup_file="$BACKUP_DIR/mqtt-config-$timestamp.json"
    
    cp "$CONFIG_FILE" "$backup_file"
    log "Backup created: $backup_file"
    echo -e "${GREEN}Backup created: $backup_file${NC}"
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        echo -e "${RED}Error: Please specify backup file${NC}"
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}Error: Backup file not found: $backup_file${NC}"
        exit 1
    fi
    
    # Validate backup file
    if ! jq empty "$backup_file" 2>/dev/null; then
        echo -e "${RED}Error: Invalid backup file${NC}"
        exit 1
    fi
    
    # Create backup of current config before restoring
    create_backup
    
    # Restore
    cp "$backup_file" "$CONFIG_FILE"
    log "Configuration restored from: $backup_file"
    echo -e "${GREEN}Configuration restored from: $backup_file${NC}"
}

# Update configuration interactively
update_config() {
    check_config
    
    echo -e "${BLUE}MQTT Configuration Update${NC}"
    echo "Press Enter to keep current value"
    echo ""
    
    # Create temporary file
    local temp_file=$(mktemp)
    cp "$CONFIG_FILE" "$temp_file"
    
    # Get current values
    local current_host=$(jq -r '.mqtt.host' "$CONFIG_FILE")
    local current_port=$(jq -r '.mqtt.port' "$CONFIG_FILE")
    local current_username=$(jq -r '.mqtt.username' "$CONFIG_FILE")
    local current_password=$(jq -r '.mqtt.password' "$CONFIG_FILE")
    
    # Host
    echo -n "MQTT Host [$current_host]: "
    read -r new_host
    if [ -n "$new_host" ]; then
        jq ".mqtt.host = \"$new_host\"" "$temp_file" > "$CONFIG_FILE"
        cp "$CONFIG_FILE" "$temp_file"
    fi
    
    # Port
    echo -n "MQTT Port [$current_port]: "
    read -r new_port
    if [ -n "$new_port" ]; then
        if [[ "$new_port" =~ ^[0-9]+$ ]] && [ "$new_port" -ge 1 ] && [ "$new_port" -le 65535 ]; then
            jq ".mqtt.port = $new_port" "$temp_file" > "$CONFIG_FILE"
            cp "$CONFIG_FILE" "$temp_file"
        else
            echo -e "${RED}Invalid port number${NC}"
        fi
    fi
    
    # Username
    echo -n "MQTT Username [$current_username]: "
    read -r new_username
    if [ -n "$new_username" ]; then
        jq ".mqtt.username = \"$new_username\"" "$temp_file" > "$CONFIG_FILE"
        cp "$CONFIG_FILE" "$temp_file"
    fi
    
    # Password
    echo -n "MQTT Password [hidden]: "
    read -s new_password
    echo
    if [ -n "$new_password" ]; then
        jq ".mqtt.password = \"$new_password\"" "$temp_file" > "$CONFIG_FILE"
        cp "$CONFIG_FILE" "$temp_file"
    fi
    
    # Clean up
    rm "$temp_file"
    
    # Validate and show result
    echo ""
    if validate_config; then
        echo -e "${GREEN}Configuration updated successfully${NC}"
        log "Configuration updated"
    else
        echo -e "${RED}Configuration update failed${NC}"
        exit 1
    fi
}

# Test MQTT connection
test_connection() {
    check_config
    
    echo -e "${BLUE}Testing MQTT Connection...${NC}"
    
    # Get configuration
    local host=$(jq -r '.mqtt.host' "$CONFIG_FILE")
    local port=$(jq -r '.mqtt.port' "$CONFIG_FILE")
    local username=$(jq -r '.mqtt.username' "$CONFIG_FILE")
    local password=$(jq -r '.mqtt.password' "$CONFIG_FILE")
    
    echo "Testing connection to $host:$port..."
    
    # Test basic connectivity
    if timeout 5 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
        echo -e "${GREEN}✓ Port $port is accessible${NC}"
    else
        echo -e "${RED}✗ Cannot connect to port $port${NC}"
        return 1
    fi
    
    # Test API endpoint
    echo "Testing API endpoint..."
    local api_response=$(curl -s "http://10.5.50.48:3001/api/mqtt/status" 2>/dev/null)
    if [ $? -eq 0 ] && echo "$api_response" | jq -e '.success' >/dev/null 2>&1; then
        echo -e "${GREEN}✓ API endpoint is responding${NC}"
        local connected=$(echo "$api_response" | jq -r '.data.connected')
        if [ "$connected" = "true" ]; then
            echo -e "${GREEN}✓ MQTT connection is active${NC}"
        else
            echo -e "${RED}✗ MQTT connection is not active${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ API endpoint is not responding${NC}"
        return 1
    fi
    
    echo -e "${GREEN}MQTT connection test completed successfully${NC}"
    log "MQTT connection test passed"
}

# Reset to default configuration
reset_config() {
    echo -e "${YELLOW}This will reset MQTT configuration to defaults. Continue? (y/N):${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        create_backup
        
        # Create default configuration
        cat > "$CONFIG_FILE" << 'EOF'
{
  "mqtt": {
    "host": "10.5.50.48",
    "port": 1883,
    "username": "mqtt",
    "password": "mqtt",
    "clientId": "keos-api",
    "clean": true,
    "reconnectPeriod": 1000,
    "connectTimeout": 30000,
    "rejectUnauthorized": false
  },
  "topics": {
    "prefix": "hotel",
    "device": {
      "command": "{site_id}/device/{device_id}/command",
      "status": "{site_id}/device/{device_id}/status"
    },
    "wifi": {
      "config": "{site_id}/wifi/{room}/config"
    },
    "notification": {
      "system": "{site_id}/notification/{target}",
      "guest": "{site_id}/guest/{action}"
    },
    "room": {
      "status": "{site_id}/room/{room}/status"
    },
    "order": {
      "notification": "{site_id}/order/{order_id}"
    },
    "test": {
      "connection": "test/connection",
      "general": "test"
    }
  },
  "qos": {
    "default": 0,
    "device_commands": 1,
    "notifications": 1,
    "config": 1,
    "status": 1
  },
  "retain": {
    "default": false,
    "config": true,
    "status": true
  }
}
EOF
        
        echo -e "${GREEN}Configuration reset to defaults${NC}"
        log "Configuration reset to defaults"
    else
        echo "Reset cancelled"
    fi
}

# Main script logic
case "${1:-help}" in
    "status")
        show_status
        ;;
    "backup")
        create_backup
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "update")
        update_config
        ;;
    "test")
        test_connection
        ;;
    "reset")
        reset_config
        ;;
    "validate")
        check_config
        validate_config
        ;;
    "help"|*)
        show_help
        ;;
esac 