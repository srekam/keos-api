# Keos Hotel Management API

A comprehensive Node.js API for hotel management systems with MongoDB integration, MQTT support, and real-time communication capabilities.

## 🚀 Features

- **🏨 Complete Hotel Management**: Sites, devices, admins, products, and orders
- **🗄️ Hybrid Database**: MariaDB (core data) + MongoDB (utility/logs)
- **📡 MQTT Integration**: Real-time device communication and notifications
- **🔐 JWT Authentication**: Secure admin authentication system
- **📊 Advanced Logging**: Device logs, system logs, performance analytics
- **🔄 Database Migrations**: Automated database schema management
- **🌐 RESTful API**: Clean, documented endpoints for all operations
- **📱 Mobile App Support**: Comprehensive CORS configuration for mobile apps
- **🔒 Security Features**: Helmet security, rate limiting, input validation

## 🏗️ Architecture

```
📱 Client Apps (Staff, TV, Background Services)
         │
         ├── MQTT → EMQX Broker (Real-time)
         │
         └── HTTP → Node.js API (Data Management)
                    │
                    ▼
        ┌─────────────────────────────┐
        │         MariaDB             │
        │      (Core Business Data)   │
        └─────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────┐
        │         MongoDB             │
        │      (Utility & Logs)       │
        └─────────────────────────────┘
```

## 📁 Project Structure

```
keos-api/
├── config/                 # Configuration files
│   ├── database.js        # MariaDB connection
│   ├── mongodb.js         # MongoDB connection
│   ├── mqtt.js           # MQTT configuration
│   └── mqtt-config.json  # MQTT settings
├── routes/                # API endpoints
│   ├── auth.js           # Authentication
│   ├── sites.js          # Site management
│   ├── devices.js        # Device management
│   ├── admins.js         # Admin management
│   ├── products.js       # Product catalog
│   ├── orders.js         # Order management
│   ├── logs.js           # Logging & analytics
│   ├── mqtt.js           # MQTT management
│   └── wifi.js           # WiFi configuration
├── migrations/            # Database migrations
├── server.js              # Main server file
├── migrate.js             # Migration runner
└── mqtt-config.sh        # MQTT management script
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- MariaDB/MySQL
- MongoDB (optional, for enhanced features)
- EMQX MQTT Broker

### Quick Start for Mobile Developers
```bash
# Test API connectivity
curl http://10.5.50.48:3001/health

# Test CORS support
curl http://10.5.50.48:3001/cors-test

# Test login with test credentials
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@api.com","password":"test123"}' \
  http://10.5.50.48:3001/api/auth/login
```

### Setup
```bash
# Clone repository
git clone https://github.com/srekam/keos-api.git
cd keos-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run migrate

# Start server
npm start
```

## 🔧 Configuration

### CORS Configuration
The API includes comprehensive CORS support for mobile apps and web clients:

#### **Supported Origins:**
- **Local Development**: `http://localhost:3000`, `http://localhost:3001`
- **Hotel Network**: `http://10.5.50.48:3000`, `http://10.5.50.48:3001`
- **Hotel Services**: `http://10.5.50.48:38003`, `http://10.5.50.48:38006`
- **Mobile Apps**: `capacitor://localhost`, `ionic://localhost`, `file://`
- **Development Mode**: All origins allowed when `NODE_ENV=development`

#### **CORS Features:**
- **Preflight Support**: Automatic OPTIONS request handling
- **Credential Support**: Cookies and authentication headers
- **Flexible Methods**: GET, POST, PUT, DELETE, OPTIONS, PATCH
- **Custom Headers**: X-Admin-ID, X-API-Key, Authorization
- **Cache Control**: 24-hour preflight response caching

#### **Test CORS:**
```bash
# Test CORS endpoint
curl http://10.5.50.48:3001/cors-test

# Test preflight request
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  http://10.5.50.48:3001/api/auth/login

# Test from different networks
curl -H "Origin: http://192.168.1.100:3000" http://10.5.50.48:3001/cors-test
curl -H "Origin: http://10.0.0.50:8080" http://10.5.50.48:3001/cors-test

# Test mobile app access (no origin)
curl http://10.5.50.48:3001/cors-test
```

### Environment Variables
```bash
NODE_ENV=development
DB_HOST=hotel_db
DB_PORT=3306
DB_USER=root
DB_PASS=root
DB_NAME=hotel_portal
MONGODB_URI=mongodb://mongodb:27017/hotel_utility
MQTT_BROKER=10.5.50.48
MQTT_PORT=1883
JWT_SECRET=your-super-secret-jwt-key
```

### MQTT Configuration
```json
{
  "broker": "10.5.50.48",
  "port": 1883,
  "username": "mqtt",
  "password": "mqtt",
  "clientId": "keos-api",
  "topics": {
    "device_commands": "hotel/{site_id}/device/{device_id}/command",
    "device_status": "hotel/{site_id}/device/{device_id}/status",
    "notifications": "hotel/{site_id}/notification/{target}"
  }
}
```

## 📡 API Endpoints

### 🔐 Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout  
- `GET /api/auth/verify` - Verify token

### 🏨 Site Management
- `GET /api/sites` - List all sites
- `GET /api/sites/:id` - Get site details
- `POST /api/sites` - Create new site
- `PUT /api/sites/:id` - Update site
- `DELETE /api/sites/:id` - Delete site

### 📱 Device Management
- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device details
- `POST /api/devices` - Add new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Remove device
- `GET /api/devices/site/:siteId` - Get devices by site

### 👥 Admin Management
- `GET /api/admins` - List all admins
- `GET /api/admins/:id` - Get admin details
- `POST /api/admins` - Create admin account
- `PUT /api/admins/:id` - Update admin
- `DELETE /api/admins/:id` - Remove admin

### 📦 Product Management
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Add new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Remove product

### 🛒 Order Management
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Remove order

### 📊 Logging & Analytics
- `GET /api/logs/status` - MongoDB connection status
- `GET /api/logs/device/:id` - Device activity logs
- `GET /api/logs/system` - System performance logs
- `GET /api/logs/performance/:id` - Performance metrics
- `GET /api/logs/analytics/site/:id` - Site analytics
- `POST /api/logs/device` - Add device log entry

### 📡 MQTT Management
- `GET /api/mqtt/status` - Connection status
- `GET /api/mqtt/config` - Current configuration
- `POST /api/mqtt/reload-config` - Reload configuration
- `POST /api/mqtt/test` - Test connection
- `POST /api/mqtt/publish` - Publish message

### 📶 WiFi Configuration
- `GET /api/wifi/networks` - List WiFi networks
- `POST /api/wifi/configure` - Configure WiFi settings
- `GET /api/wifi/status` - WiFi connection status

### 🏥 System Health
- `GET /health` - Overall system health
- `GET /cors-test` - CORS configuration test

### Site Management
- `GET /api/sites` - List all sites
- `GET /api/sites/:id` - Get site details
- `POST /api/sites` - Create new site
- `PUT /api/sites/:id` - Update site
- `DELETE /api/sites/:id` - Delete site

### Device Management
- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device details
- `POST /api/devices` - Add new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Remove device

### Admin Management
- `GET /api/admins` - List all admins
- `GET /api/admins/:id` - Get admin details
- `POST /api/admins` - Create admin account
- `PUT /api/admins/:id` - Update admin
- `DELETE /api/admins/:id` - Remove admin

### Logging & Analytics
- `GET /api/logs/status` - MongoDB connection status
- `GET /api/logs/device/:id` - Device activity logs
- `GET /api/logs/system` - System performance logs
- `GET /api/logs/performance/:id` - Performance metrics
- `GET /api/logs/analytics/site/:id` - Site analytics

### MQTT Management
- `GET /api/mqtt/status` - Connection status
- `GET /api/mqtt/config` - Current configuration
- `POST /api/mqtt/reload-config` - Reload configuration
- `POST /api/mqtt/test` - Test connection

## 🔌 MQTT Integration

### Topics Structure
- **Device Commands**: `hotel/{site_id}/device/{device_id}/command`
- **Device Status**: `hotel/{site_id}/device/{device_id}/status`
- **WiFi Config**: `hotel/{site_id}/wifi/{room}/config`
- **Notifications**: `hotel/{site_id}/notification/{target}`
- **Room Status**: `hotel/{site_id}/room/{room}/status`
- **Orders**: `hotel/{site_id}/order/{order_id}`

### Management Script
```bash
# View configuration
./mqtt-config.sh status

# Test connection
./mqtt-config.sh test

# Update configuration
./mqtt-config.sh update

# Create backup
./mqtt-config.sh backup
```

## 🗄️ Database Schema

### MariaDB (Core Data)
- **sites**: Hotel locations and information
- **devices**: Smart TV and IoT devices
- **admins**: User accounts and permissions
- **admin_site**: Admin-site relationships
- **products**: Hotel amenities and services
- **product_orders**: Guest orders and requests

### MongoDB (Utility Data)
- **device_logs**: Device activity and status logs
- **system_logs**: System performance and error logs
- **performance_data**: Analytics and metrics
- **analytics_data**: Site-specific analytics
- **reports**: Generated reports and summaries
- **audit_trails**: User action logs
- **mqtt_logs**: MQTT communication logs

## 🚀 API Usage Examples

### 🔐 Authentication
```javascript
// Login
const response = await fetch('http://10.5.50.48:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@api.com',
    password: 'test123'
  })
});

const { success, admin, session } = await response.json();

// Verify token
const verifyResponse = await fetch('http://10.5.50.48:3001/api/auth/verify?admin_id=' + admin.id);
const verifyData = await verifyResponse.json();
```

### 🏨 Site Management
```javascript
// Get all sites
const sitesResponse = await fetch('http://10.5.50.48:3001/api/sites');
const sites = await sitesResponse.json();

// Get specific site
const siteResponse = await fetch('http://10.5.50.48:3001/api/sites/1');
const site = await siteResponse.json();

// Create new site
const newSiteResponse = await fetch('http://10.5.50.48:3001/api/sites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Hotel',
    address: '123 New Street',
    phone: '0123456789',
    email: 'info@newhotel.com',
    timezone: 'Asia/Bangkok',
    currency: 'THB'
  })
});
```

### 📱 Device Management
```javascript
// Get all devices
const devicesResponse = await fetch('http://10.5.50.48:3001/api/devices');
const devices = await devicesResponse.json();

// Get devices by site
const siteDevicesResponse = await fetch('http://10.5.50.48:3001/api/devices/site/1');
const siteDevices = await siteDevicesResponse.json();

// Add new device
const newDeviceResponse = await fetch('http://10.5.50.48:3001/api/devices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'TV-001',
    type: 'smart_tv',
    site_id: 1,
    status: 'active'
  })
});
```

### 📊 Logging & Analytics
```javascript
// Add device log
const logResponse = await fetch('http://10.5.50.48:3001/api/logs/device', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    device_id: 'device-001',
    site_id: '1',
    log_type: 'activity',
    message: 'Device rebooted successfully',
    level: 'info'
  })
});

// Get system logs
const systemLogsResponse = await fetch('http://10.5.50.48:3001/api/logs/system');
const systemLogs = await systemLogsResponse.json();
```

### 📡 MQTT Integration
```javascript
// Check MQTT status
const mqttStatusResponse = await fetch('http://10.5.50.48:3001/api/mqtt/status');
const mqttStatus = await mqttStatusResponse.json();

// Publish MQTT message
const mqttPublishResponse = await fetch('http://10.5.50.48:3001/api/mqtt/publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'hotel/1/device/001/command',
    message: 'reboot',
    qos: 1
  })
});
```

### Device Management
```javascript
// Get all devices for a site
const devices = await fetch(`http://10.5.50.48:3001/api/devices?site_id=1`);

// Send device command via MQTT
const mqttResponse = await fetch('http://10.5.50.48:3001/api/mqtt/publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'hotel/1/device/001/command',
    message: 'reboot'
  })
});
```

### Logging
```javascript
// Add device log
const logResponse = await fetch('http://10.5.50.48:3001/api/logs/device', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    device_id: 'device-001',
    site_id: '1',
    log_type: 'activity',
    message: 'Device rebooted successfully'
  })
});
```

## 🔧 Development

### Running Locally
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run migrations
npm run migrate
```

### Database Migrations
```bash
# Create new migration
echo "ALTER TABLE sites ADD COLUMN new_field VARCHAR(255);" > migrations/002_add_field.sql

# Run migrations
npm run migrate

# Check migration status
npm run migrate:status
```

## 🐳 Docker Deployment

### Docker Compose
```yaml
keos-api:
  image: node:18-alpine
  container_name: hotel_keos_api
  working_dir: /app
  volumes:
    - ./keos-api:/app
  ports:
    - "3001:3000"
  environment:
    - NODE_ENV=production
    - DB_HOST=hotel_db
    - DB_PORT=3306
    - DB_USER=root
    - DB_PASS=root
    - DB_NAME=hotel_portal
  command: sh -c "npm install && npm start"
  networks:
    - hotel-network
  depends_on:
    - hotel_db
    - mongodb
```

## 📊 Monitoring & Health

### Health Check
```bash
curl http://10.5.50.48:3001/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-08-14T02:31:31.646Z",
  "mariadb": "connected",
  "mongodb": "connected"
}
```

### Status Endpoints
- `/health` - Overall system health
- `/api/logs/status` - MongoDB connection status
- `/api/mqtt/status` - MQTT connection status

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin access
- **Rate Limiting**: API request throttling
- **Audit Logging**: Complete user action tracking

## 📱 Client Integration

### Mobile App Support
The API is fully optimized for mobile applications with comprehensive CORS support:

#### **Android Staff App**
- Real-time job notifications via MQTT
- Hotel data synchronization via HTTP API
- Offline capability with local caching
- **CORS Ready**: No additional configuration needed

#### **Flutter TV App**
- Guest services and room control
- IoT device management via MQTT
- WiFi configuration and QR codes
- **CORS Ready**: Works with all Flutter HTTP clients

#### **React Native Apps**
- Cross-platform hotel management
- Real-time updates via MQTT
- Secure authentication via JWT
- **CORS Ready**: Native fetch API support

#### **Capacitor/Ionic Apps**
- Hybrid mobile applications
- Hotel system integration
- Offline-first architecture
- **CORS Ready**: Native mobile CORS support

### Background Services
- System monitoring and maintenance
- Automated device management
- Performance analytics collection

## 🧪 Testing & Validation

### **API Testing Suite**
```bash
# 1. Health Check
curl http://10.5.50.48:3001/health

# 2. CORS Test
curl http://10.5.50.48:3001/cors-test

# 3. Authentication Test
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@api.com","password":"test123"}' \
  http://10.5.50.48:3001/api/auth/login

# 4. Sites API Test
curl http://10.5.50.48:3001/api/sites

# 5. MQTT Status Test
curl http://10.5.50.48:3001/api/mqtt/status

# 6. MongoDB Status Test
curl http://10.5.50.48:3001/api/logs/status
```

### **Cross-Network Testing**
```bash
# Test from different network origins
curl -H "Origin: http://192.168.1.100:3000" http://10.5.50.48:3001/cors-test
curl -H "Origin: http://10.0.0.50:8080" http://10.5.50.48:3001/cors-test
curl -H "Origin: http://172.16.0.100:3000" http://10.5.50.48:3001/cors-test

# Test preflight requests
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://10.5.50.48:3001/api/auth/login
```

### **Mobile App Testing**
```bash
# Test mobile app access (no origin header)
curl http://10.5.50.48:3001/cors-test

# Test authentication from mobile
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@api.com","password":"test123"}' \
  http://10.5.50.48:3001/api/auth/login
```

## 🎯 Quick Commands

### **Service Management**
```bash
# Start all services
docker-compose up -d

# Check service status
docker ps

# View logs
docker-compose logs keos-api

# Restart specific service
docker-compose restart keos-api
```

### **API Testing**
```bash
# Health check
curl http://10.5.50.48:3001/health

# CORS test
curl http://10.5.50.48:3001/cors-test

# Test login
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@api.com","password":"test123"}' \
  http://10.5.50.48:3001/api/auth/login
```

### **Database Operations**
```bash
# Run migrations
cd keos-api && npm run migrate

# MongoDB commands
docker-compose up -d mongodb mongo-express
docker exec mongodb mongosh hotel_utility --eval "db.getCollectionNames()"
curl http://10.5.50.48:3001/api/logs/status
```

### **Cross-Network Testing**
```bash
# Test from different networks
curl -H "Origin: http://192.168.1.100:3000" http://10.5.50.48:3001/cors-test
curl -H "Origin: http://10.0.0.50:8080" http://10.5.50.48:3001/cors-test
```

## 🚨 Troubleshooting

### Common Issues
1. **Database Connection Errors**: Check MariaDB service status
2. **MongoDB Connection Issues**: Verify MongoDB container is running
3. **MQTT Connection Problems**: Check EMQX broker status
4. **Authentication Failures**: Verify JWT secret configuration
5. **CORS Issues**: Check origin headers and preflight requests

### Debug Commands
```bash
# Check service status
docker-compose ps

# View API logs
docker-compose logs keos-api

# Test database connection
docker exec hotel_db mysql -u root -proot -e "SELECT 1;"

# Test MongoDB
docker exec mongodb mongosh hotel_utility --eval "db.getCollectionNames()"

# Test MQTT
mosquitto_pub -h 10.5.50.48 -p 1883 -t "test" -m "Hello"

# Test CORS configuration
curl -v http://10.5.50.48:3001/cors-test

# Test CORS preflight
curl -v -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  http://10.5.50.48:3001/api/auth/login

# Test mobile app login
curl -X POST -H "Content-Type: application/json" \
  -H "Origin: capacitor://localhost" \
  -d '{"email":"test@api.com","password":"test123"}' \
  http://10.5.50.48:3001/api/auth/login
```

## 📈 Performance & Scaling

- **Connection Pooling**: Optimized database connections
- **Caching**: Redis integration for frequently accessed data
- **Load Balancing**: Horizontal scaling support
- **Monitoring**: Performance metrics and alerting
- **Optimization**: Query optimization and indexing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software for Keos Hotel Management System.

## 📞 Support

For support and questions:
- **Email**: support@keos.com
- **Documentation**: [Hotel Management System Guide](../README.md)
- **Issues**: GitHub Issues (if public)

---

**Last Updated**: 2025-08-14  
**Version**: 1.2.0  
**Status**: Production Ready + Open Network CORS + Mobile App Support  
**Architecture**: Node.js + MariaDB + MongoDB + MQTT + Open CORS
