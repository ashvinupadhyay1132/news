
// This file is used to run code when the Next.js server starts up.
// Cron service has been removed. Manual updates are handled via the admin panel.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] No automatic background tasks to register for Node.js runtime.');
    // If other non-cron startup tasks were needed, they would go here.
    // For example, ensuring database connection and indexes are set up (already handled in mongodb.ts on first access).
  } else {
    // console.log(`[Instrumentation] Skipping registration for runtime: ${process.env.NEXT_RUNTIME || 'unknown (likely client or edge)'}.`);
  }
}

