/**
 * Story Chat Service
 * Stateful multi-turn chat for AI-assisted story/prompt development
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, any>;
}
export interface ChatSession {
    id: number;
    userId: number;
    storyBibleId?: number;
    context: Record<string, any>;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Create a new chat session
 */
export declare function createChatSession(userId: number, storyBibleId?: number, context?: Record<string, any>): Promise<ChatSession>;
/**
 * Get a chat session by ID
 */
export declare function getChatSession(id: number): Promise<ChatSession | null>;
/**
 * Get all chat sessions for a user
 */
export declare function getUserChatSessions(userId: number): Promise<ChatSession[]>;
/**
 * Add a message to a chat session
 */
export declare function addMessage(sessionId: number, role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, any>): Promise<void>;
/**
 * Send a chat message and get AI response
 */
export declare function sendChatMessage(sessionId: number, userMessage: string, options?: {
    agent?: 'director' | 'screenwriter';
    template?: 'cinematic' | 'dynamic' | 'simple' | 'pixar';
}): Promise<{
    reply: string;
    suggestedPrompts?: string[];
    sceneUpdates?: any;
}>;
/**
 * Delete a chat session and all its messages
 */
export declare function deleteChatSession(id: number): Promise<void>;
/**
 * Generate a scene breakdown from chat context
 */
export declare function generateSceneBreakdown(sessionId: number, sceneCount?: number): Promise<{
    scenes: Array<{
        number: number;
        title: string;
        description: string;
        videoPrompt: string;
        speechText?: string;
        cameraMotion: string;
    }>;
}>;
//# sourceMappingURL=storyChatService.d.ts.map