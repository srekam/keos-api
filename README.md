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

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/verify` - Verify token

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

## 🚀 Usage Examples

### Authentication
```javascript
const response = await fetch('http://10.5.50.48:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@hotel.com',
    password: 'password'
  })
});

const { success, admin, session } = await response.json();
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
**Version**: 1.1.0  
**Status**: Production Ready + Mobile App CORS Support  
**Architecture**: Node.js + MariaDB + MongoDB + MQTT + CORS
