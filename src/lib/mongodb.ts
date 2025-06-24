import { MongoClient, type Db, type Collection, type Document } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

function getMaskedMongoURI(uri?: string): string {
  if (!uri) return "MONGODB_URI is not defined";
  try {
    const url = new URL(uri);
    if (url.password) {
      url.password = "****"; // Mask password
    }
    return url.toString();
  } catch (e) {
    return "Invalid MONGODB_URI format";
  }
}

if (!MONGODB_URI) {
  console.error('[MongoDB] CRITICAL ERROR: MONGODB_URI environment variable is not defined.');
  throw new Error('MongoDB URI is not defined. Please check environment variables.');
}

if (!MONGODB_DB_NAME) {
  console.error('[MongoDB] CRITICAL ERROR: MONGODB_DB_NAME environment variable is not defined.');
  throw new Error('MongoDB DB Name is not defined. Please check environment variables.');
}

// Recommended options for serverless environments to prevent connection storms
const options = {
  maxPoolSize: 10, // Limit the connection pool size
  wtimeoutMS: 2500,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// This is the recommended approach for handling DB connections in serverless environments.
// We cache the connection promise in a global variable. This prevents us from creating
// a new connection on every serverless function invocation.
let globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

if (!globalWithMongo._mongoClientPromise) {
  client = new MongoClient(MONGODB_URI, options);
  console.log('[MongoDB] Creating new connection promise.');
  globalWithMongo._mongoClientPromise = client.connect().then(async (client) => {
      console.log('[MongoDB] New connection established. Ensuring indexes...');
      await ensureAllIndexes(client.db(MONGODB_DB_NAME));
      return client;
  }).catch(err => {
      console.error('[MongoDB] Critical connection failure:', err);
      // If connection fails, unset the promise to allow for a retry on the next request.
      globalWithMongo._mongoClientPromise = undefined;
      throw err;
  });
}

clientPromise = globalWithMongo._mongoClientPromise;


// Helper to compare simple objects (like index key definitions)
function areObjectsEqual(obj1: any, obj2: any): boolean {
    if (obj1 === null || obj1 === undefined || obj2 === null || obj2 === undefined) {
        return obj1 === obj2;
    }
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (let i = 0; i < keys1.length; i++) {
        const key = keys1[i];
        if (key !== keys2[i] || obj1[key] !== obj2[key]) {
            return false;
        }
    }
    return true;
}

const ensureIndex = async (
    collection: Collection<Document>,
    keyDefinition: Document,
    options: { name: string; unique?: boolean; expireAfterSeconds?: number },
    desiredName: string
) => {
    const fullOptions = { ...options, name: desiredName };
    let existingIndexes: any[] = [];
  
    try {
      existingIndexes = await collection.listIndexes().toArray();
    } catch (error: any) {
      if (error.codeName === 'NamespaceNotFound') {
        console.log(`[MongoDB] Collection '${collection.collectionName}' does not exist yet. Will proceed with index creation for '${desiredName}'.`);
      } else {
        console.error(`[MongoDB] Error listing indexes for '${collection.collectionName}' (index: '${desiredName}'):`, error);
        throw error;
      }
    }
  
    const indexWithDesiredName = existingIndexes.find(idx => idx.name === desiredName);
    let needsCreationOrRecreation = false;
  
    if (indexWithDesiredName) {
      let definitionMatches = areObjectsEqual(indexWithDesiredName.key, keyDefinition);
      if (fullOptions.unique !== undefined && indexWithDesiredName.unique !== fullOptions.unique) {
        definitionMatches = false;
      }
      if (fullOptions.expireAfterSeconds !== undefined && indexWithDesiredName.expireAfterSeconds !== fullOptions.expireAfterSeconds) {
        definitionMatches = false;
      }
  
      if (!definitionMatches) {
        console.warn(`[MongoDB] Index '${desiredName}' on '${collection.collectionName}' exists but its definition differs. Dropping for re-creation.`);
        try {
          await collection.dropIndex(desiredName);
          console.log(`[MongoDB] Dropped index '${desiredName}' on '${collection.collectionName}'.`);
          needsCreationOrRecreation = true;
        } catch (dropError) {
          console.error(`[MongoDB] Error dropping index '${desiredName}' on '${collection.collectionName}' for re-creation:`, dropError);
          throw dropError;
        }
      }
    } else {
      needsCreationOrRecreation = true;
    }
  
    if (needsCreationOrRecreation) {
      const conflictingKeyIndex = existingIndexes.find(idx => idx.name !== desiredName && areObjectsEqual(idx.key, keyDefinition));
      if (conflictingKeyIndex) {
        console.warn(`[MongoDB] Found conflicting index '${conflictingKeyIndex.name}' with the same key definition as desired for '${desiredName}' on '${collection.collectionName}'. Dropping conflicting index.`);
        try {
          await collection.dropIndex(conflictingKeyIndex.name);
          console.log(`[MongoDB] Dropped conflicting key index '${conflictingKeyIndex.name}' on '${collection.collectionName}'.`);
        } catch (dropConflictError) {
          console.error(`[MongoDB] Error dropping conflicting key index '${conflictingKeyIndex.name}' on '${collection.collectionName}':`, dropConflictError);
          throw dropConflictError;
        }
      }
  
      try {
        console.log(`[MongoDB] Creating index '${desiredName}' with key ${JSON.stringify(keyDefinition)} and options ${JSON.stringify(fullOptions)} on collection '${collection.collectionName}'.`);
        await collection.createIndex(keyDefinition, fullOptions);
        console.log(`[MongoDB] Index '${desiredName}' created successfully on '${collection.collectionName}'.`);
      } catch (createError) {
        console.error(`[MongoDB] Error creating index '${desiredName}' with key ${JSON.stringify(keyDefinition)} on '${collection.collectionName}':`, createError);
        throw createError;
      }
    }
};

// Function to ensure all indexes are created
async function ensureAllIndexes(db: Db) {
    try {
        const articlesCollection = db.collection('articles');
        await ensureIndex(articlesCollection, { createdAt: 1 }, { name: 'createdAt_ttl_index', expireAfterSeconds: 60 * 60 * 24 * 7 }, 'createdAt_ttl_index');
        await ensureIndex(articlesCollection, { id: 1 }, { name: 'article_id_unique_idx', unique: true }, 'article_id_unique_idx');
        await ensureIndex(articlesCollection, { date: -1 }, { name: 'article_date_idx' }, 'article_date_idx');
        await ensureIndex(articlesCollection, { category: 1 }, { name: 'article_category_idx' }, 'article_category_idx');
        await ensureIndex(articlesCollection, { category: 1, date: -1 }, { name: 'article_category_date_idx' }, 'article_category_date_idx');

        const adminsCollection = db.collection('admins');
        await ensureIndex(adminsCollection, { email: 1 }, { name: 'admin_email_unique_idx', unique: true }, 'admin_email_unique_idx');
        console.log('[MongoDB] All indexes checked and ensured.');
    } catch(error) {
        console.error('[MongoDB] Failed during index assurance process.', error);
        throw error;
    }
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  if(!client) {
    throw new Error('Failed to get MongoDB client instance.');
  }
  return client.db(MONGODB_DB_NAME);
}

export async function getArticlesCollection(): Promise<Collection<Document>> {
  const db = await getDb();
  return db.collection('articles');
}

export async function getAdminsCollection(): Promise<Collection<Document>> {
  const db = await getDb();
  return db.collection('admins');
}
