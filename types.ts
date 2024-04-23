import { TFile } from 'obsidian';

export interface AiChatSettings {
	stripUrls: boolean;
	modelName: string;
}

export const DEFAULT_SETTINGS: AiChatSettings = {
	stripUrls: true,
    modelName: 'llama2',
}

export interface DocumentChunk {
    id: number;
    text: string;
}

export interface BasicDocument{
    id: number;
    file: TFile;
    pointer: number;
}

export type SimilarityResult = {
    filePath: string;
    similarity: number;
    documentText: string;
};
