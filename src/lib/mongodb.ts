
import { MongoClient, type Db, type Collection, type Document, type IndexSpecification } from 'mongodb';

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
} else {
  // console.log(`[MongoDB] Using MONGODB_URI: ${getMaskedMongoURI(MONGODB_URI)}`);
}

if (!MONGODB_DB_NAME) {
  console.error('[MongoDB] CRITICAL ERROR: MONGODB_DB_NAME environment variable is not defined.');
} else {
  // console.log(`[MongoDB] Using MONGODB_DB_NAME: ${MONGODB_DB_NAME}`);
}


let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

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


async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db('admin').command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (e) {
      console.warn("[MongoDB] Cached connection check failed, attempting to reconnect.", e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    const errMsg = 'MongoDB URI or DB Name is not defined. Please check environment variables. Cannot connect.';
    console.error(`[MongoDB] CRITICAL ERROR: ${errMsg}`);
    throw new Error(errMsg);
  }

  console.log(`[MongoDB] No cached connection. Creating new connection to ${getMaskedMongoURI(MONGODB_URI)} using DB: ${MONGODB_DB_NAME}`);
  const client = new MongoClient(MONGODB_URI, {});

  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    console.log(`[MongoDB] Successfully connected to database: ${MONGODB_DB_NAME}`);

    cachedClient = client;
    cachedDb = db;

    const articlesCollection = db.collection('articles');
    await ensureIndex(articlesCollection, { createdAt: 1 }, { name: 'createdAt_ttl_index', expireAfterSeconds: 60 * 60 * 24 * 2 }, 'createdAt_ttl_index');
    await ensureIndex(articlesCollection, { id: 1 }, { name: 'article_id_unique_idx', unique: true }, 'article_id_unique_idx');
    await ensureIndex(articlesCollection, { date: -1 }, { name: 'article_date_idx' }, 'article_date_idx');
    await ensureIndex(articlesCollection, { category: 1 }, { name: 'article_category_idx' }, 'article_category_idx');
    await ensureIndex(articlesCollection, { category: 1, date: -1 }, { name: 'article_category_date_idx' }, 'article_category_date_idx');

    const adminsCollection = db.collection('admins');
    await ensureIndex(adminsCollection, { email: 1 }, { name: 'admin_email_unique_idx', unique: true }, 'admin_email_unique_idx');

    return { client, db };
  } catch (connectionError) {
    console.error(`[MongoDB] CRITICAL ERROR: Failed to connect to MongoDB at ${getMaskedMongoURI(MONGODB_URI)} (DB: ${MONGODB_DB_NAME}) or ensure indexes:`, connectionError);
    throw connectionError;
  }
}

export async function getDb(): Promise<Db> {
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    throw new Error('MongoDB URI or DB Name is not configured for getDb(). Attempting to connect will fail.');
  }
  const { db } = await connectToDatabase();
  return db;
}

export async function getArticlesCollection(): Promise<Collection<Document>> {
   if (!MONGODB_URI || !MONGODB_DB_NAME) {
    throw new Error('MongoDB URI or DB Name is not configured for getArticlesCollection(). Attempting to connect will fail.');
  }
  const db = await getDb();
  return db.collection('articles');
}

export async function getAdminsCollection(): Promise<Collection<Document>> {
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
   throw new Error('MongoDB URI or DB Name is not configured for getAdminsCollection(). Attempting to connect will fail.');
 }
 const db = await getDb();
 return db.collection('admins');
}
