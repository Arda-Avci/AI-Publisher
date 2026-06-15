"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rabbitmq_js_1 = require("../src/lib/rabbitmq.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function run() {
    await (0, rabbitmq_js_1.initRabbitMQ)();
    try {
        const channel = (0, rabbitmq_js_1.getRabbitChannel)();
        const videoQueue = await channel.checkQueue(rabbitmq_js_1.VIDEO_JOBS_QUEUE);
        const publishQueue = await channel.checkQueue(rabbitmq_js_1.PUBLISH_JOBS_QUEUE);
        console.log('--- RabbitMQ Kuyruk Durumları ---');
        console.log('Video Jobs Queue:', videoQueue);
        console.log('Publish Jobs Queue:', publishQueue);
    }
    catch (err) {
        console.error('Kuyruk kontrol edilirken hata:', err);
    }
    process.exit(0);
}
run();
