const { MongoClient } = require('mongodb');

// MongoDB Configuration
const MONGODB_CONFIG = {
    url: process.env.MONGODB_URL || 'mongodb://hotel_app:hotel_app_password@mongodb:27017/hotel_utility',
    options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        w: 'majority'
    }
};

let client = null;
let db = null;
let isConnected = false;

/**
 * Connect to MongoDB
 * @returns {Promise<Object>} Database connection
 */
async function connectToMongoDB() {
    try {
        if (client && isConnected) {
            return db;
        }

        console.log('Connecting to MongoDB...');
        client = new MongoClient(MONGODB_CONFIG.url, MONGODB_CONFIG.options);
        
        await client.connect();
        db = client.db('hotel_utility');
        isConnected = true;
        
        console.log('✅ MongoDB connected successfully');
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        isConnected = false;
        return null;
    }
}

/**
 * Get MongoDB database instance
 * @returns {Promise<Object|null>} Database instance or null if not connected
 */
async function getMongoDB() {
    if (!isConnected || !db) {
        return await connectToMongoDB();
    }
    return db;
}

/**
 * Check if MongoDB is connected
 * @returns {boolean} Connection status
 */
function isMongoDBConnected() {
    return isConnected;
}

/**
 * Close MongoDB connection
 */
async function closeMongoDBConnection() {
    try {
        if (client) {
            await client.close();
            client = null;
            db = null;
            isConnected = false;
            console.log('MongoDB connection closed');
        }
    } catch (error) {
        console.error('Error closing MongoDB connection:', error.message);
    }
}

/**
 * Graceful degradation check
 * @returns {boolean} Whether MongoDB operations should be attempted
 */
function shouldUseMongoDB() {
    return process.env.USE_MONGODB !== 'false' && isConnected;
}

/**
 * Get collection with error handling
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object|null>} Collection instance or null if error
 */
async function getCollection(collectionName) {
    try {
        const database = await getMongoDB();
        if (!database) {
            console.warn(`⚠️ MongoDB not available for collection: ${collectionName}`);
            return null;
        }
        return database.collection(collectionName);
    } catch (error) {
        console.error(`Error getting collection ${collectionName}:`, error.message);
        return null;
    }
}

/**
 * Insert document with graceful degradation
 * @param {string} collectionName - Collection name
 * @param {Object} document - Document to insert
 * @returns {Promise<Object>} Result object
 */
async function insertDocument(collectionName, document) {
    try {
        if (!shouldUseMongoDB()) {
            return { success: false, error: 'MongoDB not available', degraded: true };
        }

        const collection = await getCollection(collectionName);
        if (!collection) {
            return { success: false, error: 'Collection not available', degraded: true };
        }

        const result = await collection.insertOne({
            ...document,
            created_at: new Date(),
            updated_at: new Date()
        });

        return { success: true, insertedId: result.insertedId };
    } catch (error) {
        console.error(`Error inserting document in ${collectionName}:`, error.message);
        return { success: false, error: error.message, degraded: true };
    }
}

/**
 * Find documents with graceful degradation
 * @param {string} collectionName - Collection name
 * @param {Object} query - Query object
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Result object
 */
async function findDocuments(collectionName, query = {}, options = {}) {
    try {
        if (!shouldUseMongoDB()) {
            return { success: false, error: 'MongoDB not available', degraded: true, data: [] };
        }

        const collection = await getCollection(collectionName);
        if (!collection) {
            return { success: false, error: 'Collection not available', degraded: true, data: [] };
        }

        const cursor = collection.find(query, options);
        const documents = await cursor.toArray();

        return { success: true, data: documents };
    } catch (error) {
        console.error(`Error finding documents in ${collectionName}:`, error.message);
        return { success: false, error: error.message, degraded: true, data: [] };
    }
}

/**
 * Update document with graceful degradation
 * @param {string} collectionName - Collection name
 * @param {Object} filter - Filter object
 * @param {Object} update - Update object
 * @returns {Promise<Object>} Result object
 */
async function updateDocument(collectionName, filter, update) {
    try {
        if (!shouldUseMongoDB()) {
            return { success: false, error: 'MongoDB not available', degraded: true };
        }

        const collection = await getCollection(collectionName);
        if (!collection) {
            return { success: false, error: 'Collection not available', degraded: true };
        }

        const result = await collection.updateOne(filter, {
            $set: {
                ...update,
                updated_at: new Date()
            }
        });

        return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
        console.error(`Error updating document in ${collectionName}:`, error.message);
        return { success: false, error: error.message, degraded: true };
    }
}

/**
 * Delete document with graceful degradation
 * @param {string} collectionName - Collection name
 * @param {Object} filter - Filter object
 * @returns {Promise<Object>} Result object
 */
async function deleteDocument(collectionName, filter) {
    try {
        if (!shouldUseMongoDB()) {
            return { success: false, error: 'MongoDB not available', degraded: true };
        }

        const collection = await getCollection(collectionName);
        if (!collection) {
            return { success: false, error: 'Collection not available', degraded: true };
        }

        const result = await collection.deleteOne(filter);
        return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
        console.error(`Error deleting document in ${collectionName}:`, error.message);
        return { success: false, error: error.message, degraded: true };
    }
}

/**
 * Aggregate documents with graceful degradation
 * @param {string} collectionName - Collection name
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {Promise<Object>} Result object
 */
async function aggregateDocuments(collectionName, pipeline) {
    try {
        if (!shouldUseMongoDB()) {
            return { success: false, error: 'MongoDB not available', degraded: true, data: [] };
        }

        const collection = await getCollection(collectionName);
        if (!collection) {
            return { success: false, error: 'Collection not available', degraded: true, data: [] };
        }

        const cursor = collection.aggregate(pipeline);
        const documents = await cursor.toArray();

        return { success: true, data: documents };
    } catch (error) {
        console.error(`Error aggregating documents in ${collectionName}:`, error.message);
        return { success: false, error: error.message, degraded: true, data: [] };
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Closing MongoDB connection...');
    await closeMongoDBConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Closing MongoDB connection...');
    await closeMongoDBConnection();
    process.exit(0);
});

module.exports = {
    connectToMongoDB,
    getMongoDB,
    isMongoDBConnected,
    closeMongoDBConnection,
    shouldUseMongoDB,
    getCollection,
    insertDocument,
    findDocuments,
    updateDocument,
    deleteDocument,
    aggregateDocuments,
    MONGODB_CONFIG
}; 