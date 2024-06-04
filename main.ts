import {App, Notice, Plugin, PluginSettingTab, Setting, TFile} from 'obsidian';
import { DocumentStore } from './DocumentStore';
import { AiChatSettings, DEFAULT_SETTINGS } from './types';
import {SideDrawerView} from "./SideDrawer";
// Remember to rename these classes and interfaces!

export default class AiChat extends Plugin {
	settings: AiChatSettings;
	documentStore: DocumentStore;
	private statusBar: HTMLElement;
	ribbonIconElIndex: HTMLElement;

	async onload() {
		await this.loadSettings();
		this.app.vault.on('modify', this.handleFileModify.bind(this));

		this.ribbonIconElIndex = this.addRibbonIcon('archive-restore', 'Index Current File', async (evt: MouseEvent) => {
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
		// Register the new view
		this.registerView('ai-chat-side-drawer', (leaf) => new SideDrawerView(leaf, this));

		// Add a command to open the side drawer
		this.addCommand({
			id: 'chat-side-drawer',
			name: 'Open Chat Side View',
			callback: () => this.activateView(),
		});

		// Add a command to open the side drawer
		this.addCommand({
			id: 'async-index-all',
			name: 'Index All Files',
			callback: () => this.documentStore.addAllDocuments(this.app.vault.getMarkdownFiles().map(file => file.path)),
		});

		this.addCommand({
			id: 'persist-documents',
			name: 'Persist Index',
			callback: () => this.documentStore.persistIndex(),
		});

		this.addCommand({
			id: 'summarize-current-page',
			name: 'Summarize Current Page',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const summary = await this.documentStore.summarizeTFile(activeFile);
					await this.app.vault.modify(activeFile, `\n\n## Summary\n\n${summary}`);
					new Notice('Summary has been appended to the current file.');
				}
			},
		});

		this.addCommand({
			id: 'load-documents',
			name: 'Load Index',
			callback: () => this.documentStore.loadFromIndex(),
		});
		// Perform additional things with the ribbon
		this.ribbonIconElIndex.addClass('current-file-indexed');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		this.statusBar = this.addStatusBarItem();


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));


		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// THIS CAN BE USED TO PERFORM A MAINTENANCE OPERATION LIKE GARBAGE COLLECTION
		// IT SIMPLY EXECUTES A FUNCTION EVERY X MINUTES
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.documentStore = new DocumentStore(this.app, this, this.statusBar);
		await this.documentStore.onload();
	}
	private handleFileModify(file: TFile) {
		if (file === this.app.workspace.getActiveFile()) {
			this.ribbonIconElIndex.removeClass('current-file-indexed');
			this.ribbonIconElIndex.addClass('current-file-not-indexed');
		}
	}
	onunload() {

	}

	async indexAllFiles() {
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			// check if the file is already indexed
			// if not, index it
			if (!this.documentStore.isIndexed(file.path)) {
				await this.documentStore.addDocumentPath(file.path);
			}
			await this.documentStore.addDocumentPath(file.path);
		}

	}
	// Function to activate the view
	async activateView() {
		this.app.workspace.detachLeavesOfType('ai-chat-side-drawer');

		let leaf = this.app.workspace.getLeavesOfType('ai-chat-side-drawer')[0];

		if (!leaf) {
			leaf = this.app.workspace.getRightLeaf(true);
		}

		await leaf.setViewState({
			type: 'ai-chat-side-drawer',
		});

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
					.addOption('llama2', 'Llama2 ollama 7B')
					.setValue(this.plugin.settings.modelName)
					.onChange((value) => {
						this.plugin.settings.modelName = value;
						this.plugin.saveSettings().then(r => console.log("Settings saved"));
					});
			});

		new Setting(containerEl)
			.setName('Strip URLs')
			.setDesc('Enable this option to strip URLs from documents during indexing')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.stripUrls)
				.onChange(value => {
					this.plugin.settings.stripUrls = value;
					this.plugin.saveSettings();
				}));

		
	}
}
