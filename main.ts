import { App, TFile , Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { DocumentStore } from './DocumentStore';
import { ChatBox } from './ChatBox';
import { AiChatSettings, DEFAULT_SETTINGS } from './types';
import {SideDrawerView} from "./SideDrawer";
// Remember to rename these classes and interfaces!

export default class AiChat extends Plugin {
	settings: AiChatSettings;
	documentStore: DocumentStore;
	chatBox: ChatBox;
	filesToReprocess: Set<string> = new Set();

	async onload() {
		// await this.loadSettings();
		this.documentStore = new DocumentStore(this.app, this, ".datastoreAiChat");
		await this.documentStore.onload();
		this.chatBox = new ChatBox(this.app, this);

		// This creates an icon in the left ribbon.
		const ribbonIconElChat = this.addRibbonIcon('message-square' , 'AI-Chat', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Welcome to AI Chat!');
			this.chatBox.open();
		});

		const ribbonIconElIndex = this.addRibbonIcon('archive-restore', 'Index Current File', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			const activeFile = this.app.workspace.getActiveFile();	
			if (activeFile) {
				const numberOfDocuments = await this.documentStore.addDocumentPath(activeFile.path);
				new Notice('Reindexed current file ! Total number of indexed documents indexed: ' + numberOfDocuments);
			}
		});

		const ribbonIconElNumberOfDocs = this.addRibbonIcon('tally-5', 'Number of Indexed Documents', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			const numberOfDocuments = await this.documentStore.getTotalNumberOfIndexedDocuments();
			new Notice('Total number of indexed documents indexed: ' + numberOfDocuments);
		});

		this.addCommand({
            id: 'open-chat-modal',
            name: 'Open Chat',
            callback: () => {
                this.chatBox.open();
            }
        })

		// Perform additional things with the ribbon
		ribbonIconElIndex.addClass('current-file-indexed');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// Register the new view
		this.registerView('ai-chat-side-drawer', (leaf) => new SideDrawerView(leaf, this));

		// Add a command to open the side drawer
		this.addCommand({
			id: 'open-ai-chat-side-drawer',
			name: 'Open AI Chat Side View',
			callback: () => this.activateView(),
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// 
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// THIS CAN BE USED TO PERFORM A MAINTENANCE OPERATION LIKE GARBAGE COLLECTION
		// IT SIMPLY EXECUTES A FUNCTION EVERY X MINUTES
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}
	// Function to activate the view
	async activateView() {
		this.app.workspace.detachLeavesOfType('ai-chat-side-drawer');

		let leaf = this.app.workspace.getLeavesOfType('ai-chat-side-drawer')[0];

		// If the leaf doesn't exist, create a new one
		if (!leaf) {
			leaf = this.app.workspace.getRightLeaf(true);
		}

		// Set the view state of the leaf to your custom view
		await leaf.setViewState({
			type: 'ai-chat-side-drawer',
		});

		// await this.app.workspace.getRightLeaf(true).setViewState({
		// 	type: 'ai-chat-side-drawer',
		// });

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType('ai-chat-side-drawer')[0]
		);
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async processFile(file: TFile) {
        // Read file content
        const content = await this.app.vault.read(file);
        
        // Here you would implement the logic to generate the embedding and index it
        console.log(`Processing file: ${file.path}`);
		new Notice('This is a notice that we are processing 2!');
        // Example: generateEmbeddingAndIndex(content, file.path);
    }
}

class SampleSettingTab extends PluginSettingTab {
	plugin: AiChat;

	constructor(app: App, plugin: AiChat) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Select Ollama Model')
			.setDesc('Choose Ollama model from the dropdown')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('llama2', 'Llama2 - 7B')
					.addOption('codellama', 'CodeLlama  - 7B')
					.addOption('llama3', 'Mistral  - 7B')
					.setValue(this.plugin.settings.selectedOption)
					.onChange((value) => {
						this.plugin.settings.selectedOption = value;
						this.plugin.saveSettings().then(r => console.log("Settings saved"));
					});
			});

		
	}
}
