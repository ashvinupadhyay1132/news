
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // If GOOGLE_APPLICATION_CREDENTIALS is set, it will use that.
      // Otherwise, in Firebase Hosting/Functions, it uses the default service account.
      // For local dev without GOOGLE_APPLICATION_CREDENTIALS, you might need to provide credentials:
      // credential: admin.credential.cert(require('./path/to/your/serviceAccountKey.json')),
      // databaseURL: "https://your-project-id.firebaseio.com" // Optional, if using Realtime Database
    });
    console.log("Firebase Admin SDK initialized.");
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
    // If running in an environment where initializeApp() is called automatically (e.g. some Firebase Functions setups)
    // this catch block might be triggered. Check if apps exist.
    if (!admin.apps.length) {
        // This would be an actual error if it still has no apps.
        console.error("Firebase Admin SDK failed to initialize and no apps are present.");
    } else {
        console.warn("Firebase Admin SDK might have been initialized elsewhere or automatically.");
    }
  }
}

export const adminDB = admin.firestore();
export const adminAuth = admin.auth();
// Add other admin services if needed, e.g., admin.storage()
