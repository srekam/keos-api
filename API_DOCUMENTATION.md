# Keos Hotel API Documentation

## 📋 API Overview

**Base URL**: `http://10.5.50.48:3001`  
**Version**: 1.2.0  
**Status**: Production Ready  
**CORS**: Open to all networks

## 🔐 Authentication

### Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "test@api.com",
  "password": "test123"
}
```

**Response:**
```json
{
  "success": true,
  "admin": {
    "id": 9,
    "email": "test@api.com",
    "name": "API Test User",
    "verified": 1
  },
  "session": {
    "admin_id": 9,
    "email": "test@api.com",
    "name": "API Test User",
    "role": "ADMIN",
    "permissions": [],
    "sites": []
  }
}
```

### Verify Token
**GET** `/api/auth/verify?admin_id={id}`

**Response:**
```json
{
  "success": true,
  "admin": {
    "id": 9,
    "email": "test@api.com",
    "name": "API Test User",
    "verified": 1
  }
}
```

## 🏨 Site Management

### Get All Sites
**GET** `/api/sites`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "hotel1",
      "address": "123 Main St, City",
      "phone": "0123456789",
      "timezone": "Asia/Bangkok",
      "currency": "THB"
    }
  ]
}
```

### Get Site by ID
**GET** `/api/sites/{id}`

### Create Site
**POST** `/api/sites`

**Request Body:**
```json
{
  "name": "New Hotel",
  "address": "123 New Street",
  "phone": "0123456789",
  "email": "info@newhotel.com",
  "timezone": "Asia/Bangkok",
  "currency": "THB"
}
```

## 📱 Device Management

### Get All Devices
**GET** `/api/devices`

### Get Devices by Site
**GET** `/api/devices/site/{siteId}`

### Create Device
**POST** `/api/devices`

**Request Body:**
```json
{
  "name": "TV-001",
  "type": "smart_tv",
  "site_id": 1,
  "status": "active"
}
```

## 📊 Logging & Analytics

### Get MongoDB Status
**GET** `/api/logs/status`

**Response:**
```json
{
  "success": true,
  "mongodb": {
    "connected": true,
    "should_use": true,
    "available": true
  },
  "collections": [
    "device_logs",
    "system_logs",
    "performance_data",
    "reports",
    "audit_trails",
    "analytics_data",
    "mqtt_logs"
  ]
}
```

### Add Device Log
**POST** `/api/logs/device`

**Request Body:**
```json
{
  "device_id": "device-001",
  "site_id": "1",
  "log_type": "activity",
  "message": "Device rebooted successfully",
  "level": "info"
}
```

## 📡 MQTT Management

### Get MQTT Status
**GET** `/api/mqtt/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "timestamp": "2025-08-14T04:24:46.748Z"
  }
}
```

### Publish MQTT Message
**POST** `/api/mqtt/publish`

**Request Body:**
```json
{
  "topic": "hotel/1/device/001/command",
  "message": "reboot",
  "qos": 1
}
```

## 🏥 System Health

### Health Check
**GET** `/health`

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-08-14T04:24:46.748Z",
  "mariadb": "connected",
  "mongodb": "connected"
}
```

### CORS Test
**GET** `/cors-test`

**Response:**
```json
{
  "message": "CORS is working!",
  "timestamp": "2025-08-14T04:24:46.748Z",
  "origin": "No origin header",
  "userAgent": "curl/7.81.0",
  "cors": {
    "allowedOrigins": "All origins allowed",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    "credentials": true,
    "networkAccess": "Open to all networks"
  }
}
```

## 🧪 Testing Examples

### Test Authentication
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@api.com","password":"test123"}' \
  http://10.5.50.48:3001/api/auth/login
```

### Test CORS from Different Networks
```bash
# From localhost
curl -H "Origin: http://localhost:3000" http://10.5.50.48:3001/cors-test

# From external network
curl -H "Origin: http://192.168.1.100:3000" http://10.5.50.48:3001/cors-test

# From mobile app (no origin)
curl http://10.5.50.48:3001/cors-test
```

### Test Preflight Request
```bash
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://10.5.50.48:3001/api/auth/login
```

## 🔧 Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "errors": [
    {
      "msg": "Invalid email",
      "param": "email",
      "location": "body"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid credentials"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

## 📱 Mobile App Integration

### CORS Support
- **All Origins**: Open to any network
- **Credentials**: Supported for authentication
- **Methods**: GET, POST, PUT, DELETE, OPTIONS, PATCH
- **Headers**: Custom headers supported

### Authentication Flow
1. **Login**: POST to `/api/auth/login`
2. **Store Session**: Save admin_id and session data
3. **API Calls**: Include admin_id in requests
4. **Verify**: Use `/api/auth/verify` to check validity

### Example Mobile App Code
```javascript
// Login
const loginResponse = await fetch('http://10.5.50.48:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@api.com',
    password: 'test123'
  })
});

const { success, admin, session } = await loginResponse.json();

// Use session data for subsequent requests
localStorage.setItem('admin_id', admin.id);
localStorage.setItem('session_data', JSON.stringify(session));
```

## 🚀 Performance Tips

1. **Use Connection Pooling**: Database connections are optimized
2. **Batch Requests**: Combine multiple API calls when possible
3. **Cache Responses**: Store frequently accessed data locally
4. **Monitor Rate Limits**: API allows 100 requests per 15 minutes
5. **Use MQTT**: For real-time updates instead of polling

---

**Last Updated**: 2025-08-14  
**API Version**: 1.2.0  
**Status**: Production Ready
