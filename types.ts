import { TFile } from 'obsidian';

export interface AiChatSettings {
	stripUrls: boolean;
	selectedOption: string;
}

export const DEFAULT_SETTINGS: AiChatSettings = {
	stripUrls: true,
    selectedOption: 'llama2',
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
