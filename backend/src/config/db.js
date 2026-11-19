const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

let dbInstance = null;
let queryFn, runFn, getFn;

if (DB_TYPE === 'sqlite') {
    const sqlite3 = require('sqlite3').verbose();
    const dbFile = process.env.DB_FILE || './predictive_maint.db';
    const dbPath = path.isAbsolute(dbFile) ? dbFile : path.resolve(__dirname, '../../', dbFile);

    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ [Database] Error connecting to SQLite database:', err.message);
        } else {
            console.log('✅ [Database] Connected to SQLite database at:', dbPath);
        }
    });

    queryFn = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    };

    runFn = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    };

    getFn = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    };

    dbInstance = db;
} else if (DB_TYPE === 'postgres' || DB_TYPE === 'postgresql') {
    let pg;
    try {
        pg = require('pg');
    } catch (e) {
        throw new Error('❌ [Database] DB_TYPE is set to postgres, but "pg" npm package is not installed. Run `npm install pg`.');
    }

    const { Pool } = pg;
    const readSecret = (fileEnv, valueEnv) => {
        const secretFile = process.env[fileEnv];
        if (secretFile) {
            const secretFilePath = path.isAbsolute(secretFile) ? secretFile : path.resolve(__dirname, '../../../', secretFile);
            try {
                return fs.readFileSync(secretFilePath, 'utf8').trim();
            } catch (err) {
                throw new Error(`❌ [Database] Could not read secret file configured by ${fileEnv}: ${err.message}`);
            }
        }
        return process.env[valueEnv];
    };

    const databasePassword = readSecret('DB_PASSWORD_FILE', 'DB_PASSWORD');
    const poolConfig = process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 5432),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: databasePassword
        };

    if (!process.env.DATABASE_URL &&
        (!poolConfig.host || !poolConfig.database || !poolConfig.user || !poolConfig.password)) {
        throw new Error('❌ [Database] PostgreSQL requires DATABASE_URL or DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD_FILE/DB_PASSWORD.');
    }

    const pool = new Pool({
        ...poolConfig,
        ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'
            ? { rejectUnauthorized: false }
            : false
    });

    pool.on('error', (err) => {
        console.error('❌ [Database] Unexpected error on idle PostgreSQL client:', err);
    });

    console.log('✅ [Database] PostgreSQL pool initialized.');

    // Convert SQLite style ? placeholders to Postgres $1, $2, ...
    const convertPlaceholders = (sql) => {
        let count = 1;
        return sql.replace(/\?/g, () => `$${count++}`);
    };

    queryFn = async (sql, params = []) => {
        const pgSql = convertPlaceholders(sql);
        const res = await pool.query(pgSql, params);
        return res.rows || [];
    };

    runFn = async (sql, params = []) => {
        const pgSql = convertPlaceholders(sql);
        const res = await pool.query(pgSql, params);
        return { id: null, changes: res.rowCount };
    };

    getFn = async (sql, params = []) => {
        const pgSql = convertPlaceholders(sql);
        const res = await pool.query(pgSql, params);
        return res.rows[0];
    };

    dbInstance = pool;
} else {
    throw new Error(`❌ [Database] Unsupported DB_TYPE: '${DB_TYPE}'. Supported values: sqlite, postgres.`);
}

module.exports = {
    db: dbInstance,
    query: queryFn,
    run: runFn,
    get: getFn,
    dbType: DB_TYPE
};
