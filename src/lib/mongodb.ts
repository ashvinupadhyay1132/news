
import { MongoClient, type Db, type Collection, type Document } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not defined.');
  // throw new Error('MONGODB_URI environment variable is not defined.'); // Or handle as appropriate
}
if (!MONGODB_DB_NAME) {
  console.error('Error: MONGODB_DB_NAME environment variable is not defined.');
  // throw new Error('MONGODB_DB_NAME environment variable is not defined.'); // Or handle as appropriate
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    try {
      // Verify connection by pinging the admin database
      await cachedClient.db('admin').command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (e) {
      // Connection might have been lost, reset cached client and db
      console.warn("MongoDB connection lost, attempting to reconnect.", e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    // This check is important here because the process might continue if only console.error was used above
    throw new Error('MongoDB URI or DB Name is not defined. Please check environment variables.');
  }

  const client = new MongoClient(MONGODB_URI, {
    // Consider adding serverApi options for Atlas if applicable
    // serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
  });

  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);

    cachedClient = client;
    cachedDb = db;

    // Ensure TTL index on articles collection
    const articlesCollection = db.collection('articles');
    const indexName = 'createdAt_ttl_index';
    const indexes = await articlesCollection.listIndexes().toArray();
    const ttlIndexExists = indexes.some(idx => idx.name === indexName);

    if (!ttlIndexExists) {
      try {
        // TTL index for documents to expire after 7 days (604800 seconds)
        await articlesCollection.createIndex({ createdAt: 1 }, { name: indexName, expireAfterSeconds: 60 * 60 * 24 * 7 });
        console.log("TTL index on 'createdAt' for 'articles' collection created successfully.");
      } catch (indexError) {
        console.error("Error creating TTL index for 'articles':", indexError);
        // Decide if this error is critical. For now, we log and continue.
      }
    }
     // Optional: Ensure an index on 'id' if it's frequently used for queries/upserts
    const idIndexName = 'article_id_unique_idx';
    const idIndexExists = indexes.some(idx => idx.name === idIndexName);
    if(!idIndexExists) {
        try {
            await articlesCollection.createIndex({ id: 1}, { name: idIndexName, unique: true });
            console.log("Unique index on 'id' for 'articles' collection created successfully.");
        } catch (indexError) {
            console.error("Error creating unique index on 'id' for 'articles':", indexError);
        }
    }

    // Ensure index on 'date' for sorting
    const dateIndexName = 'article_date_idx';
    const dateIndexExists = indexes.some(idx => idx.name === dateIndexName);
    if (!dateIndexExists) {
      try {
        await articlesCollection.createIndex({ date: -1 }, { name: dateIndexName });
        console.log("Index on 'date' for 'articles' collection created successfully.");
      } catch (indexError) {
        console.error("Error creating index on 'date' for 'articles':", indexError);
      }
    }

    // Ensure index on 'category' for filtering
    const categoryIndexName = 'article_category_idx';
    const categoryIndexExists = indexes.some(idx => idx.name === categoryIndexName);
    if (!categoryIndexExists) {
      try {
        await articlesCollection.createIndex({ category: 1 }, { name: categoryIndexName });
        console.log("Index on 'category' for 'articles' collection created successfully.");
      } catch (indexError) {
        console.error("Error creating index on 'category' for 'articles':", indexError);
      }
    }
    
    // Ensure compound index for common queries like category and date
    const categoryDateIndexName = 'article_category_date_idx';
    const categoryDateIndexExists = indexes.some(idx => idx.name === categoryDateIndexName);
    if(!categoryDateIndexExists) {
        try {
            await articlesCollection.createIndex({ category: 1, date: -1 }, { name: categoryDateIndexName });
            console.log("Compound index on 'category' and 'date' for 'articles' collection created successfully.");
        } catch (indexError) {
            console.error("Error creating compound index on 'category' and 'date' for 'articles':", indexError);
        }
    }


    return { client, db };
  } catch (connectionError) {
    console.error("Failed to connect to MongoDB:", connectionError);
    // Optional: close client if partially connected and errored
    // await client.close();
    throw connectionError; // Rethrow to indicate failure
  }
}

export async function getDb(): Promise<Db> {
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    // Added to prevent function call if config is missing
    throw new Error('MongoDB URI or DB Name is not configured for getDb().');
  }
  const { db } = await connectToDatabase();
  return db;
}

// Using Document as a generic type, specific ArticleDocument can be defined if needed elsewhere
export async function getArticlesCollection(): Promise<Collection<Document>> {
   if (!MONGODB_URI || !MONGODB_DB_NAME) {
    // Added to prevent function call if config is missing
    throw new Error('MongoDB URI or DB Name is not configured for getArticlesCollection().');
  }
  const db = await getDb();
  return db.collection('articles');
}

