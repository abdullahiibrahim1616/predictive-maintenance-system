const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbFile = path.resolve(process.env.DB_FILE || path.join(__dirname, '../predictive_maint.db'));
const backupDir = path.resolve(__dirname, '../backups');

function restoreBackup(targetBackupName) {
    if (!fs.existsSync(backupDir)) {
        console.error('❌ [DB Restore] No backups directory found.');
        process.exit(1);
    }

    let sourceFile;

    if (targetBackupName) {
        sourceFile = path.join(backupDir, targetBackupName);
        if (!fs.existsSync(sourceFile)) {
            console.error(`❌ [DB Restore] Specified backup file does not exist: ${sourceFile}`);
            process.exit(1);
        }
    } else {
        // Find most recent backup
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('predictive_maint_backup_') && f.endsWith('.db'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length === 0) {
            console.error('❌ [DB Restore] No backup snapshots found in backups directory.');
            process.exit(1);
        }

        sourceFile = path.join(backupDir, files[0].name);
    }

    fs.copyFileSync(sourceFile, dbFile);
    console.log(`✅ [DB Restore] Restored database from: ${path.basename(sourceFile)} -> ${dbFile}`);
}

if (require.main === module) {
    const backupArg = process.argv[2];
    restoreBackup(backupArg);
}

module.exports = { restoreBackup };
