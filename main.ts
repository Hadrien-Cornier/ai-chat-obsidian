import { App, TFile , Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextComponent, ButtonComponent } from 'obsidian';

class ChatModal extends Modal {
    private input: TextComponent;
    private output: HTMLDivElement;

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        let {contentEl} = this;

        contentEl.empty();

        contentEl.createEl('h1', {text: 'Ask Me Anything'});

        this.input = new TextComponent(contentEl)
            .setPlaceholder('Type your question here...')
            .onChange(async (value) => {
                // This is where you'd handle the input value, possibly sending it to your RAG model
                // For demonstration, we'll just echo the input
                this.setOutputText(`You asked: ${value}`);
            });

        contentEl.createEl('br');

        const submitButton = new ButtonComponent(contentEl)
            .setButtonText('Ask')
            .onClick(() => {
                // Simulate asking a question
                this.input.inputEl.dispatchEvent(new Event('change'));
            });

        this.output = contentEl.createDiv();
        this.output.addClass('chat-output');
    }

    private setOutputText(text: string) {
        this.output.setText(text);
    }

    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
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
                new ChatModal(this.app).open();
            }
        })

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
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
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

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
        // Example: generateEmbeddingAndIndex(content, file.path);
    }
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
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
