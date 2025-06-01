
import { MongoClient, type Db, type Collection } from 'mongodb';
import type { Article } from './placeholder-data';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not defined.');
}
if (!MONGODB_DB_NAME) {
  console.error('Error: MONGODB_DB_NAME environment variable is not defined.');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db('admin').command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (e) {
      // Connection might have been lost, reset cached client and db
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  if (!MONGODB_DB_NAME) {
    throw new Error('MONGODB_DB_NAME environment variable is not defined.');
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
