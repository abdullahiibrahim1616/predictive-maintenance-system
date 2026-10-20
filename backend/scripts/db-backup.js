const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbFile = path.resolve(process.env.DB_FILE || path.join(__dirname, '../predictive_maint.db'));
const backupDir = path.resolve(__dirname, '../backups');
const MAX_BACKUPS = 10;

function createBackup() {
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    if (!fs.existsSync(dbFile)) {
        console.warn(`⚠️ [DB Backup] Source database file not found at: ${dbFile}. Skipping backup.`);
        return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `predictive_maint_backup_${timestamp}.db`;
    const targetPath = path.join(backupDir, backupFileName);

    fs.copyFileSync(dbFile, targetPath);
    console.log(`✅ [DB Backup] Successfully created database snapshot: ${backupFileName}`);

    // Retention policy: Keep the newest MAX_BACKUPS
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('predictive_maint_backup_') && f.endsWith('.db'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length > MAX_BACKUPS) {
            const toDelete = files.slice(MAX_BACKUPS);
            for (const item of toDelete) {
                fs.unlinkSync(path.join(backupDir, item.name));
                console.log(`🧹 [DB Backup] Purged older snapshot: ${item.name}`);
            }
        }
    } catch (err) {
        console.warn('⚠️ [DB Backup] Failed to prune old snapshots:', err.message);
    }

    return targetPath;
}

if (require.main === module) {
    createBackup();
}

module.exports = { createBackup };
