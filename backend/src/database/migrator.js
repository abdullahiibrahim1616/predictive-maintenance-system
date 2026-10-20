const fs = require('fs');
const path = require('path');
const { query, run, get, dbType } = require('../config/db');
const { createBackup } = require('../../scripts/db-backup');

async function runMigrations() {
    console.log('🔄 [Migrator] Checking database schema version & running migrations...');

    // 1. Create a snapshot backup before running migrations if on SQLite
    if (dbType === 'sqlite') {
        try {
            createBackup();
        } catch (e) {
            console.warn('⚠️ [Migrator] Could not create pre-migration snapshot:', e.message);
        }
    }

    // 2. Ensure schema_migrations table exists
    if (dbType === 'sqlite') {
        await run(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_name TEXT UNIQUE NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } else {
        await run(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    const appliedRows = await query(`SELECT migration_name FROM schema_migrations`);
    const appliedSet = new Set(appliedRows.map(r => r.migration_name));

    // 3. Backward-compatibility check: if users table already exists, baseline migration is already applied
    if (!appliedSet.has('001_baseline_schema.sql')) {
        let tablesExist = false;
        if (dbType === 'sqlite') {
            const tableCheck = await get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`);
            tablesExist = !!tableCheck;
        } else {
            const tableCheck = await get(`SELECT table_name FROM information_schema.tables WHERE table_name='users'`);
            tablesExist = !!tableCheck;
        }

        if (tablesExist) {
            console.log('ℹ️ [Migrator] Detected existing baseline schema. Recording 001_baseline_schema.sql as applied.');
            await run(`INSERT INTO schema_migrations (migration_name) VALUES (?)`, ['001_baseline_schema.sql']);
            appliedSet.add('001_baseline_schema.sql');
        }
    }

    // 4. Scan migrations folder
    const migrationsDir = path.resolve(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
        console.log('ℹ️ [Migrator] No migrations directory found.');
        return;
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql') || f.endsWith('.js'))
        .sort();

    let appliedCount = 0;

    for (const file of files) {
        if (!appliedSet.has(file)) {
            console.log(`🚀 [Migrator] Applying migration: ${file}`);
            const filePath = path.join(migrationsDir, file);

            if (file.endsWith('.sql')) {
                const sqlContent = fs.readFileSync(filePath, 'utf8');
                const statements = sqlContent
                    .split(';')
                    .map(s => s.trim())
                    .filter(s => s.length > 0 && !s.startsWith('--'));

                for (const stmt of statements) {
                    await run(stmt);
                }
            } else if (file.endsWith('.js')) {
                const migrationMod = require(filePath);
                if (typeof migrationMod.up === 'function') {
                    await migrationMod.up({ run, query, get, dbType });
                } else {
                    throw new Error(`Migration ${file} does not export an up() function.`);
                }
            }

            await run(`INSERT INTO schema_migrations (migration_name) VALUES (?)`, [file]);
            appliedSet.add(file);
            appliedCount++;
            console.log(`✅ [Migrator] Successfully applied migration: ${file}`);
        }
    }

    if (appliedCount === 0) {
        console.log('✅ [Migrator] Database schema is up to date.');
    } else {
        console.log(`🎉 [Migrator] Finished running ${appliedCount} new migration(s).`);
    }
}

if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('❌ [Migrator] Migration failed:', err);
            process.exit(1);
        });
}

module.exports = { runMigrations };
