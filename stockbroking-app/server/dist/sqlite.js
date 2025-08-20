import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
let database = null;
export function getDatabase() {
    if (database)
        return database;
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir))
        fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'app.sqlite');
    database = new Database(dbPath);
    return database;
}
//# sourceMappingURL=sqlite.js.map