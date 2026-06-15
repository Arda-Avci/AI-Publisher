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
    const job = await db_js_1.db.get('SELECT id, status, current_stage, progress_percent FROM video_jobs WHERE id = 90');
    console.log('--- Job 90 Durumu ---');
    console.log(JSON.stringify(job, null, 2));
    process.exit(0);
}
run();
