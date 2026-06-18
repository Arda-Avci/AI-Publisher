export declare const VIDEO_JOBS_QUEUE = "video_jobs_queue";
export declare const PUBLISH_JOBS_QUEUE = "publish_jobs_queue";
export declare const CLIP_JOBS_QUEUE = "clip_jobs_queue";
/**
 * RabbitMQ yeniden bağlandığında çalıştırılacak callback'leri kaydeder.
 */
export declare function registerReconnectCallback(cb: () => void | Promise<void>): void;
export declare function initRabbitMQ(): Promise<void>;
export declare function getRabbitChannel(): any;
/**
 * Belirtilen kuyruğa yeni bir iş ekler.
 */
export declare function sendToQueue(queueName: string, data: object): Promise<void>;
//# sourceMappingURL=rabbitmq.d.ts.map