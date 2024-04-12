import { App, TFile , Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { DocumentStore } from './DocumentStore';
import { ChatBox } from './ChatBox';
import { AiChatSettings, DEFAULT_SETTINGS } from './types';
// Remember to rename these classes and interfaces!


export default class AiChat extends Plugin {
	settings: AiChatSettings;
	documentStore: DocumentStore;
	chatBox: ChatBox;
	filesToReprocess: Set<string> = new Set();;

	async onload() {
		// await this.loadSettings();
		this.documentStore = new DocumentStore(this.app, this, ".datastoreAiChat");
		this.chatBox = new ChatBox(this.app, this);

	

		// this.registerEvent(
		// 	this.app.vault.on('create', (file: TFile) => {
		// 		// if (file instanceof TFile && file.extension === 'md') {
		// 		// 	this.filesToReprocess.add(file.path);
		// 		// }
		// 	})
		// );
		
		// this.registerEvent(
		// 	this.app.vault.on('modify', (file: TFile) => {
		// 		// if (file instanceof TFile && file.extension === 'md') {
		// 		// 	// TODO : optimize this so that we do not reinfer the file if we only modify one bit of it
		// 		// 	this.filesToReprocess.add(file.path);
		// 		// }
		// 	})
		// );

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'AI-Chat', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		this.addCommand({
            id: 'open-chat-modal',
            name: 'Open Chat',
            callback: () => {
                this.chatBox.open();
            }
        })

		// this.addCommand({
		// 	// this is not robust to a restart of the app
		// 	// more robust to check if the file has been indexed
		// 	id: 'index-new-files',
		// 	name: 'Index New Files',
		// 	callback: () => {
		// 		this.filesToReprocess.forEach(filePath => this.documentStore.(filePath));
		// 		this.filesToReprocess.forEach(filePath => this.documentStore.addDocumentPath(filePath));
        //     }
        // })

		//add a command to add wipe the storage an reindex all the files
		// this.addCommand({
		// 	id: 'Reindex-all-files',
		// 	name: 'Reindex All Files',
		// 	callback: () => {
		// 		this.documentStore.clear();
		// 		this.app.vault.getMarkdownFiles().forEach(file => this.documentStore.addDocumentPath(file.path));
		// 	}
		// })

		this.addCommand({
			id: 'Reindex-current-file',
			name: 'Reindex Current File',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					this.documentStore.addDocumentPath(activeFile.path);
				}
			}
		})

		// this.addCommand({
		// 	id: 'Reindex-all-open-files',
		// 	name: 'Reindex All Open Files',
		// 	callback: () => {
		// 		this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
		// 			leaf.open(leaf.view);
		// 			this.documentStore.removeDocumentPath(leaf.openFile());
		// 			this.documentStore.addDocumentPath(leaf.view.file);
		// 			}
		// 		})
		// 	}
		// })


		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds an editor command that can perform some operation on the current editor instance
		
		// TODO : WE could imagine an editor command to get the llm to autocomplete the current line

		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// async getListOfNonIndexedFiles() {
	// 	const files = this.app.vault.getMarkdownFiles();
	// 	const indexedFiles = await this.documentStore.indexedFiles;
	// 	return files.filter(file => !indexedFiles.includes(file.path));
	// }

	private async processFile(file: TFile) {
        // Read file content
        const content = await this.app.vault.read(file);
        
        // Here you would implement the logic to generate the embedding and index it
        console.log(`Processing file: ${file.path}`);
		new Notice('This is a notice that we are processing 2!');
        // Example: generateEmbeddingAndIndex(content, file.path);
    }
}``

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
		.setName('Cohere API Key')
		.setDesc('Cohere API Key')
		.addSearch((search) => {
			search
				.setPlaceholder('API Key')
				.setValue(this.plugin.settings.selectedOption)
				.onChange((value) => {
					this.plugin.settings.selectedOption = value;
					this.plugin.saveSettings();
				});
		});

		new Setting(containerEl)
			.setName('Select LLM Model')
			.setDesc('Choose a model from the dropdown')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('llama2 - 7B', 'Llama2 - 7B')
					.addOption('codellama', 'CodeLlama  - 7B')
					.addOption('mistral - 7B', 'Mistral  - 7B')
					.setValue(this.plugin.settings.selectedOption)
					.onChange((value) => {
						this.plugin.settings.selectedOption = value;
						this.plugin.saveSettings();
					});
			});
	}
}
