export interface AiChatSettings {
	stripUrls: boolean;
	modelName: string;
}

export const DEFAULT_SETTINGS: AiChatSettings = {
	stripUrls: true,
    modelName: 'llama2',
}

export enum DocStoreStrategy {
	UPSERTS = "upserts",
	DUPLICATES_ONLY = "duplicates_only",
	UPSERTS_AND_DELETE = "upserts_and_delete",
	NONE = "none"
}
