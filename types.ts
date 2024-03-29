import { TFile } from 'obsidian';

export interface AiChatSettings {
	selectedOption: string;
}

export const DEFAULT_SETTINGS: AiChatSettings = {
    selectedOption: 'llama2',
}

export interface DocumentChunk {
    id: number;
    text: string;
}

export interface Document{
    id: number;
    file: TFile;
    pointer: number;
}

export type SimilarityResult = {
    filePath: string;
    similarity: number;
    documentText: string;
};