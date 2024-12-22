const cron = require('node-cron');
const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const { UsersPgTable } = require('../../lib/postgres_drizzle/users.orm.ts');
require('dotenv').config({ path: '.env.local' });
const { sql } = require('drizzle-orm');

// Database connection and Drizzle setup
const db = drizzle(
  neon("postgres://default:wms5Fyb2aTLe@ep-purple-wave-a4t3r8p3-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require") 
);


const logoutInactiveUsers = async () => {
  try {
    // Calculate the timestamp for 1 hour ago
    const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60).toISOString();

    // Execute the query using the Drizzle db instance and Drizzle's sql
    const result = await db.execute(
      sql`UPDATE users
          SET loggedin = false
          WHERE lastlogin < ${oneHourAgo};`
    );

    console.log(`[${new Date().toISOString()}] Successfully logged out inactive users.`);
    console.log(`Rows updated: ${result.rowCount || 0}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error logging out inactive users:`, error);
  }
};

// Call the function (you can also schedule this using node-cron)
cron.schedule('0 * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running scheduled task: logoutInactiveUsers`);
  await logoutInactiveUsers();
});

console.log('Cron job scheduled to run every hour.');