const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

// Load MQTT Configuration from JSON file
function loadMqttConfig() {
    try {
        const configPath = path.join(__dirname, 'mqtt-config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Generate unique client ID
        config.mqtt.clientId = `${config.mqtt.clientId}-${Math.random().toString(16).slice(3)}`;
        
        return config;
    } catch (error) {
        console.error('Error loading MQTT config:', error);
        // Fallback to default configuration
        return {
            mqtt: {
                host: '10.5.50.48',
                port: 1883,
                username: 'mqtt',
                password: 'mqtt',
                clientId: `keos-api-${Math.random().toString(16).slice(3)}`,
                clean: true,
                reconnectPeriod: 1000,
                connectTimeout: 30 * 1000,
                rejectUnauthorized: false
            },
            topics: {
                prefix: 'hotel'
            },
            qos: {
                default: 0,
                device_commands: 1,
                notifications: 1,
                config: 1,
                status: 1
            },
            retain: {
                default: false,
                config: true,
                status: true
            }
        };
    }
}

// Load configuration
const CONFIG = loadMqttConfig();
const MQTT_CONFIG = CONFIG.mqtt;

// MQTT Client instance
let mqttClient = null;

// Connect to MQTT broker
function connectMQTT() {
    return new Promise((resolve, reject) => {
        try {
            mqttClient = mqtt.connect(MQTT_CONFIG);
            
            mqttClient.on('connect', () => {
                console.log('✅ MQTT Connected to broker');
                resolve(mqttClient);
            });
            
            mqttClient.on('error', (error) => {
                console.error('❌ MQTT Connection error:', error);
                reject(error);
            });
            
            mqttClient.on('close', () => {
                console.log('🔌 MQTT Connection closed');
            });
            
            mqttClient.on('reconnect', () => {
                console.log('🔄 MQTT Reconnecting...');
            });
            
        } catch (error) {
            console.error('❌ MQTT Setup error:', error);
            reject(error);
        }
    });
}

// Publish message to MQTT topic
function publishMessage(topic, message, options = {}) {
    return new Promise((resolve, reject) => {
        if (!mqttClient || !mqttClient.connected) {
            reject(new Error('MQTT client not connected'));
            return;
        }
        
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        
        // Use configuration defaults if not provided
        const publishOptions = {
            qos: options.qos ?? CONFIG.qos.default,
            retain: options.retain ?? CONFIG.retain.default
        };
        
        mqttClient.publish(topic, payload, publishOptions, (error) => {
            if (error) {
                console.error('❌ MQTT Publish error:', error);
                reject(error);
            } else {
                console.log(`📤 MQTT Published to ${topic}:`, payload);
                resolve();
            }
        });
    });
}

// Subscribe to MQTT topic
function subscribeToTopic(topic, callback) {
    return new Promise((resolve, reject) => {
        if (!mqttClient || !mqttClient.connected) {
            reject(new Error('MQTT client not connected'));
            return;
        }
        
        mqttClient.subscribe(topic, (error) => {
            if (error) {
                console.error('❌ MQTT Subscribe error:', error);
                reject(error);
            } else {
                console.log(`📥 MQTT Subscribed to ${topic}`);
                
                // Set up message handler
                mqttClient.on('message', (receivedTopic, message) => {
                    if (receivedTopic === topic) {
                        try {
                            const parsedMessage = JSON.parse(message.toString());
                            callback(parsedMessage);
                        } catch (e) {
                            callback(message.toString());
                        }
                    }
                });
                
                resolve();
            }
        });
    });
}

// Get MQTT client status
function isConnected() {
    return mqttClient && mqttClient.connected;
}

// Disconnect MQTT client
function disconnectMQTT() {
    if (mqttClient) {
        mqttClient.end();
        mqttClient = null;
        console.log('🔌 MQTT Disconnected');
    }
}

// Reload configuration
function reloadConfig() {
    try {
        const newConfig = loadMqttConfig();
        Object.assign(CONFIG, newConfig);
        Object.assign(MQTT_CONFIG, newConfig.mqtt);
        console.log('✅ MQTT Configuration reloaded');
        return true;
    } catch (error) {
        console.error('❌ Failed to reload MQTT configuration:', error);
        return false;
    }
}

// Get current configuration
function getConfig() {
    return CONFIG;
}

module.exports = {
    connectMQTT,
    publishMessage,
    subscribeToTopic,
    isConnected,
    disconnectMQTT,
    reloadConfig,
    getConfig,
    mqttClient,
    CONFIG
}; 