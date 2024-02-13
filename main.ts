import { App, TFile , Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextComponent, ButtonComponent } from 'obsidian';
import { DocumentStore } from './DocumentStore';
import { ChatBox } from './ChatBox';

// Remember to rename these classes and interfaces!

interface AiChatSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: AiChatSettings = {
	mySetting: 'default'
}

export default class AiChat extends Plugin {
	settings: AiChatSettings;
	documentStore: DocumentStore;
	chatBox: ChatBox;

	async onload() {
		await this.loadSettings();
		this.documentStore = new DocumentStore(this.app, this.settings);
		this.chatBox = new ChatBox(this.app);
		// Listen for file creation
		this.registerEvent(
			this.app.vault.on('create', (file: TFile) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.processFile(file);
				}
			})
		);

		// Listen for file modification
		this.registerEvent(
			this.app.vault.on('modify', (file: TFile) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.processFile(file);
				}
			})
		);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
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

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
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

	private async processFile(file: TFile) {
        // Read file content
        const content = await this.app.vault.read(file);
        
        // Here you would implement the logic to generate the embedding and index it
        console.log(`Processing file: ${file.path}`);
		new Notice('This is a notice that we are processing!');
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
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
