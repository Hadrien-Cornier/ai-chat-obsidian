import {ItemView, WorkspaceLeaf, TextComponent, ButtonComponent} from 'obsidian';
import {ChatHistory} from "./ChatBox";
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
		// const titleDiv = container.createDiv();
		// titleDiv.addClass('view-header-title-container');
		// titleDiv.setText('AI Chat');
		// container.createEl('h1', { text: this.getDisplayText() });
		// container.createEl('hr'); // Add a horizontal line

		// Create chat history display
		const historyDiv = container.createDiv();
		historyDiv.setText(this.chatHistory.getHistory());

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
		// // Create submit button
		// const submitButton = new ButtonComponent(buttonDiv)
		// 	.setButtonText('Ask')
		// 	.onClick(async () => {
		// 		await this.answerInteraction(historyDiv);
		// 	});
		// submitButton.buttonEl.addClass('submit-button');

		// Create font size buttons
		// const increaseButton = new ButtonComponent(buttonDiv)
		// 	.setButtonText('A ↑')
		// 	.onClick(() => {
		// 		const currentSize = parseFloat(window.getComputedStyle(historyDiv).fontSize);
		// 		historyDiv.style.fontSize = (currentSize + 1) + 'px';
		// 	});
		// increaseButton.buttonEl.addClass('font-size-buttons');
		// increaseButton.buttonEl.addClass('increase-button');
		//
		// const decreaseButton = new ButtonComponent(buttonDiv)
		// 	.setButtonText('A ↓')
		// 	.onClick(() => {
		// 		const currentSize = parseFloat(window.getComputedStyle(historyDiv).fontSize);
		// 		if (currentSize > 1) {
		// 			historyDiv.style.fontSize = (currentSize - 1) + 'px';
		// 		}
		// 	});
		// decreaseButton.buttonEl.addClass('font-size-buttons');
		// decreaseButton.buttonEl.addClass('decrease-button');

		// // the explanation of this is crazy
		// setTimeout(() => {
		// 	let obj = (decreaseButton.buttonEl as HTMLElement);
		// 	obj.style.fontSize = '0.8em';
		// }, 200);
	}

	private async answerInteraction(historyDiv: HTMLDivElement) {
		const message = this.chatBox.getValue();
		this.chatHistory.addMessage('Q: ' + message);
		this.updateChatHistory(historyDiv);
		this.chatBox.setValue('');

		const answer = await this.docStore.answer(message);
		if (answer.response) {
			// Use the model name from the settings instead of 'A:'
			this.chatHistory.addMessage(this.plugin.settings.modelName + ': ' + answer.response);
			this.updateChatHistory(historyDiv);
		}
	}

	updateChatHistory(historyDiv: HTMLElement) {
		historyDiv.empty();
		const messages = this.chatHistory.getHistory().split('\n');
		for (let message of messages) {
			const span = historyDiv.createSpan();
			const messageDiv = historyDiv.createDiv({ cls: 'message' });
			if (message.startsWith('Q:')) {
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
			} else if (message.startsWith(this.plugin.settings.modelName + ':')) {
				// Check if the message starts with the model name instead of 'A:'
				messageDiv.createEl('b', { text: this.plugin.settings.modelName + ': ' + message.slice((this.plugin.settings.modelName + ':').length), cls: 'answer' });
			}
		}
	}
	async onClose() {
		// Clean up if necessary
	}
}
