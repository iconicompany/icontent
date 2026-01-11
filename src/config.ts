import path from "node:path";
import fs from "node:fs";

function getRootDir() {
    const dataDir = path.join(process.cwd(), "db");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    return dataDir;
}

export const DATA_DIR = getRootDir();

console.log(`📂 Data directory: ${DATA_DIR}`);
