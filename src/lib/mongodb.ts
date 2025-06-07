
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
} else {
  console.log(`[MongoDB] Using MONGODB_URI: ${getMaskedMongoURI(MONGODB_URI)}`);
}

if (!MONGODB_DB_NAME) {
  console.error('[MongoDB] CRITICAL ERROR: MONGODB_DB_NAME environment variable is not defined.');
} else {
  console.log(`[MongoDB] Using MONGODB_DB_NAME: ${MONGODB_DB_NAME}`);
}


let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db('admin').command({ ping: 1 });
      // console.log("[MongoDB] Using cached database connection.");
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
    const indexes = await articlesCollection.listIndexes().toArray();
    const existingIndexNames = indexes.map(idx => idx.name);
    
    const ensureIndex = async (fieldName: string | any, options: any, indexName: string) => {
      if (!existingIndexNames.includes(indexName)) {
        try {
          await articlesCollection.createIndex(fieldName, options);
          console.log(`[MongoDB] Index '${indexName}' on '${JSON.stringify(fieldName)}' for 'articles' collection created successfully.`);
        } catch (indexError) {
          console.error(`[MongoDB] Error creating index '${indexName}' for 'articles':`, indexError);
        }
      } else {
        // console.log(`[MongoDB] Index '${indexName}' already exists.`);
      }
    };

    // TTL index for 2 days
    await ensureIndex({ createdAt: 1 }, { name: 'createdAt_ttl_index', expireAfterSeconds: 60 * 60 * 24 * 2 }, 'createdAt_ttl_index');
    await ensureIndex({ id: 1 }, { name: 'article_id_unique_idx', unique: true }, 'article_id_unique_idx');
    await ensureIndex({ date: -1 }, { name: 'article_date_idx' }, 'article_date_idx');
    await ensureIndex({ category: 1 }, { name: 'article_category_idx' }, 'article_category_idx');
    await ensureIndex({ category: 1, date: -1 }, { name: 'article_category_date_idx' }, 'article_category_date_idx');


    return { client, db };
  } catch (connectionError) {
    console.error(`[MongoDB] CRITICAL ERROR: Failed to connect to MongoDB at ${getMaskedMongoURI(MONGODB_URI)} (DB: ${MONGODB_DB_NAME}):`, connectionError);
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
