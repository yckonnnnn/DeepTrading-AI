/**
 * Vercel entrypoint. Reuses the Express app from server/index.js so the same
 * routes work locally and on Vercel.
 */
import app from '../server/index.js';

export default app;
