"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_js_1 = require("../src/db.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function run() {
    await (0, db_js_1.initDatabase)();
    const jobs = await db_js_1.db.all('SELECT id, status, current_stage, progress_percent, master_prompt FROM video_jobs ORDER BY id DESC LIMIT 10');
    console.log('--- Son 10 Job Durumu ---');
    console.log(JSON.stringify(jobs, null, 2));
    process.exit(0);
}
run();
