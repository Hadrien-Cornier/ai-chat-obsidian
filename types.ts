export interface AiChatSettings {
	stripUrls: boolean;
	modelName: string;
	maxWords: number;
}

export const DEFAULT_SETTINGS: AiChatSettings = {
	stripUrls: true,
    modelName: 'llama2',
	maxWords: 2000,
}

export enum DocStoreStrategy {
	UPSERTS = "upserts",
	DUPLICATES_ONLY = "duplicates_only",
	UPSERTS_AND_DELETE = "upserts_and_delete",
	NONE = "none"
}
