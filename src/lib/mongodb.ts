
import { MongoClient, type Db, type Collection } from 'mongodb';
import type { Article } from './placeholder-data'; // Assuming Article type is defined here

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}
if (!process.env.MONGODB_DB_NAME) {
  throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');
}

const MONGODB_URI: string = process.env.MONGODB_URI;
const MONGODB_DB_NAME: string = process.env.MONGODB_DB_NAME;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    try {
      // Ping the database to ensure the connection is still alive
      await cachedClient.db('admin').command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (e) {
      // Connection might have been lost, reset cached client and db
      cachedClient = null;
      cachedDb = null;
    }
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

export async function getArticlesCollection(): Promise<Collection<Article>> {
  const db = await getDb();
  return db.collection<Article>('articles');
}

// Function to ensure indexes are created
// This should ideally be run once on application startup or deployment.
// For simplicity, we can call it when the first connection is made.
let indexesEnsured = false;
async function ensureIndexes() {
  if (indexesEnsured) return;

  try {
    const articlesCollection = await getArticlesCollection();

    // Unique index on sourceLink to prevent duplicate articles
    await articlesCollection.createIndex({ sourceLink: 1 }, { unique: true });

    // TTL index on createdAt for articles to expire after 7 days (604800 seconds)
    await articlesCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });
    
    indexesEnsured = true;
  } catch (error) {
    console.error('Error creating MongoDB indexes:', error);
    // Depending on the error, you might want to throw it or handle it
    // For now, we'll log and continue, but in production, this might be critical
  }
}

// Ensure indexes on the first call to connectToDatabase or getDb
(async () => {
  if (!indexesEnsured) {
     await ensureIndexes();
  }
})();
