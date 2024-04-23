import {ItemView, WorkspaceLeaf, TextComponent, ButtonComponent, Notice} from 'obsidian';
import {ChatBox, ChatHistory} from "./ChatBox";
import {DocumentStore} from "./DocumentStore";
import AiChat from "./main";

export class SideDrawerView extends ItemView {
	private chatHistory: ChatHistory;
	private chatBox: TextComponent;
	private docStore: DocumentStore;
	private plugin: AiChat;
	constructor(leaf: WorkspaceLeaf, plugin: AiChat) {
		super(leaf);
		this.chatHistory = new ChatHistory();
		this.plugin = plugin;
		this.docStore = plugin.documentStore;
	}
	getViewType(): string {
		return 'ai-chat-side-drawer';
	}

	getDisplayText(): string {
		return 'AI Chat';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		const historyDiv = container.createDiv();
		this.updateChatHistory(historyDiv);

		// Create chat box
		this.chatBox = new TextComponent(container as HTMLElement);
		this.chatBox.setPlaceholder('Type Question For ' + this.plugin.settings.modelName +  ' ⏎');
		this.chatBox.inputEl.style.width = '100%'; // Make the text box take the entire length of the drawer
		this.chatBox.inputEl.addClass('chat-box');
		// Create a new div for the buttons
		const buttonDiv = container.createDiv();

		// Add event listener to submit question when enter is pressed
		this.chatBox.inputEl.addEventListener('keydown', async (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				await this.answerInteraction(historyDiv);
			}
		});
		const copyButton = new ButtonComponent(container as HTMLElement)
			.setButtonText('Copy Last Answer')
			.onClick(() => {
				const messages = this.chatHistory.getHistory();
				if (messages.length > 0) {
					const lastAnswer = messages[messages.length - 1];
					const answerWithoutModelName = lastAnswer.split(':').slice(1).join(':').trim();
					new Notice('Copied answer');
					navigator.clipboard.writeText(answerWithoutModelName);
				}
			});
	}

	private async answerInteraction(historyDiv: HTMLDivElement) {
		const message = this.chatBox.getValue();
		this.chatHistory.addMessage('Q: ' + message);
		this.updateChatHistory(historyDiv);
		this.chatBox.setValue('');

		// Create a new div for the loading bar
		const loadingBar = historyDiv.createDiv({ cls: 'loading-bar' });
		loadingBar.setText('Loading...'); // Set the text of the loading bar

		const answer = await this.docStore.answer(message);
		if (answer.response) {
			// Use the model name from the settings instead of 'A:'
			this.chatHistory.addMessage(this.plugin.settings.modelName + ': ' + answer.response);
			this.updateChatHistory(historyDiv);
		}

		// Hide the loading bar
		loadingBar.remove();
	}

	updateChatHistory(historyDiv: HTMLElement) {
		historyDiv.empty();
		const messages = this.chatHistory.getHistory();
		let i=0;
		for (let message of messages) {
			const span = historyDiv.createSpan();
			const messageDiv = historyDiv.createDiv({ cls: 'message' });
			if (i++ % 2 === 0) {
				messageDiv.createEl('b', { text: 'Q: ' + message.slice(2), cls: 'question' });
				const editButton = new ButtonComponent(messageDiv)
					.setTooltip('Edit')
					.setIcon('pencil')
					.onClick(() => {
						const input = new TextComponent(span);
						input.setValue(message.slice(3).trimStart());
						input.inputEl.addEventListener('keydown', async (event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								const newMessage = input.getValue();
								this.chatHistory.addMessage('Q: ' + newMessage);
								historyDiv.empty();
								const answer = await this.docStore.answer(newMessage);
								// Use the model name from the settings instead of 'A:'
								this.chatHistory.addMessage(this.plugin.settings.modelName + ': ' + answer.response);
								this.updateChatHistory(historyDiv);
							}
						});
					});
				editButton.buttonEl.addClass('edit-button');
			} else {
				// Check if the message starts with the model name instead of 'A:'
				messageDiv.createEl('b', { text: this.plugin.settings.modelName + ': ' + message.slice((this.plugin.settings.modelName + ':').length), cls: 'answer' });
			}
		}
	}
	async onClose() {
		// Clean up if necessary
	}
}
