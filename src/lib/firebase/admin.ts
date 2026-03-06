import * as admin from 'firebase-admin';

// This is a common pattern to prevent re-initializing the admin app
// in a serverless environment or during hot-reloads.
if (!admin.apps.length) {
  try {
    // Check if the environment variable is set
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set.');
    }

    // Parse the JSON credentials from the environment variable
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

// Function to get the initialized app
export const getAdminApp = () => {
    if (admin.apps.length === 0) {
        throw new Error("Firebase Admin SDK has not been initialized.");
    }
    return admin.app();
};

// Export the admin instance itself if needed elsewhere
export default admin;
