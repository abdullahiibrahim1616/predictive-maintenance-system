/**
 * Migration 002: Auth Token Hardening
 * - Adds token_version to users table for instant role revocation
 * - Creates refresh_tokens table for secure 15m/7d token lifecycle
 */
module.exports = {
    up: async ({ run, query, get, dbType }) => {
        // 1. Check if token_version exists on users
        let hasTokenVersion = false;

        if (dbType === 'sqlite') {
            const columns = await query("PRAGMA table_info(users)");
            hasTokenVersion = columns.some(c => c.name === 'token_version');
        } else {
            const check = await get(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'token_version'"
            );
            hasTokenVersion = !!check;
        }

        if (!hasTokenVersion) {
            await run(`ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1`);
            console.log('  -> Added token_version column to users table');
        } else {
            console.log('  -> token_version column already exists on users table');
        }

        // 2. Create refresh_tokens table
        await run(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('  -> Created or verified refresh_tokens table');
    }
};
