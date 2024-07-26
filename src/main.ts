import { Plugin } from 'obsidian';
import { SideDrawerView } from './components/SideDrawerView';
import { DocumentStore } from './services/DocumentStore';
import { DEFAULT_SETTINGS } from './config';

export default class AiChat extends Plugin {
    settings: AiChatSettings;
    documentStore: DocumentStore;

    async onload() {
        await this.loadSettings();
        this.documentStore = new DocumentStore();

        this.app.vault.on('modify', this.handleFileModify.bind(this));

        this.addRibbonIcon('archive-restore', 'Index Current File', async (evt: MouseEvent) => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                const numberOfDocuments = await this.documentStore.addDocumentPath(activeFile.path);
                new Notice('Reindexed current file! Total number of indexed documents: ' + numberOfDocuments);
            }
        });

        this.addRibbonIcon('tally-5', 'Number of Indexed Documents', async (evt: MouseEvent) => {
            const numberOfDocuments = await this.documentStore.getTotalNumberOfIndexedDocuments();
            new Notice('Total number of indexed documents: ' + numberOfDocuments);
        });

        this.registerView('ai-chat-side-drawer', (leaf) => new SideDrawerView(leaf, this));

        this.addCommand({
            id: 'chat-side-drawer',
            name: 'Open Chat Side View',
            callback: () => this.activateView(),
        });

        this.addCommand({
            id: 'async-index-all',
            name: 'Index All Files',
            callback: () => this.documentStore.addAllDocuments(this.app.vault.getMarkdownFiles().map(file => file.path)),
        });

        this.addCommand({
            id: 'summarize-current-page',
            name: 'Summarize Current Page',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    const summary = await this.documentStore.summarizeTFile(activeFile);
                    new Notice('Summary: ' + summary);
                }
            },
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private handleFileModify(file: TFile) {
        // Handle file modification
    }
}