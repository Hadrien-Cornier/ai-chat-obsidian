export interface AiChatSettings {
	stripUrls: boolean;
	modelName: string;
}

export const DEFAULT_SETTINGS: AiChatSettings = {
	stripUrls: true,
    modelName: 'llama2',
}
