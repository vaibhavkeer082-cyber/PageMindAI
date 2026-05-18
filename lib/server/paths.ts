import path from "path";

export const DATA_DIR = path.join(process.cwd(), ".pagemind-data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const DB_FILE = path.join(DATA_DIR, "db.json");
