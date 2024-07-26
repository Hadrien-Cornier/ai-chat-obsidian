import { AiChatSettings } from './interfaces/AiChatSettings';

export const DEFAULT_SETTINGS: AiChatSettings = {
    stripUrls: true,
    modelName: 'llama2',
    maxWords: 2000,
    openAIKey: '',
};