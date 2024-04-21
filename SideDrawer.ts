import {ItemView, WorkspaceLeaf, TextComponent, ButtonComponent} from 'obsidian';
import {ChatHistory} from "./ChatBox";
import {DocumentStore} from "./DocumentStore";
import AiChat from "./main";
// Define a new view by extending ItemView
export class SideDrawerView extends ItemView {
	private chatHistory: ChatHistory;
	private chatBox: TextComponent;
	private docStore: DocumentStore;
	constructor(leaf: WorkspaceLeaf, plugin: AiChat) {
		super(leaf);
		this.chatHistory = new ChatHistory();
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
		container.createEl('h1', { text: 'Chat Started' });

		// Create chat history display
		const historyDiv = container.createDiv();
		historyDiv.setText(this.chatHistory.getHistory());

		// Create chat box
		this.chatBox = new TextComponent(container as HTMLElement)
			.setPlaceholder('Type your questions here...');

		// Create a new div for the buttons
		const buttonDiv = container.createDiv();

		// Create submit button
		const submitButton = new ButtonComponent(buttonDiv)
			.setButtonText('Ask')
			.onClick(async () => {
				await this.answerInteraction(historyDiv);
			});

		// Add event listener to submit question when enter is pressed
		this.chatBox.inputEl.addEventListener('keydown', async (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				await this.answerInteraction(historyDiv);
			}
		});

		// Create font size buttons
		const increaseButton = new ButtonComponent(buttonDiv)
			.setButtonText('A ↑')
			.onClick(() => {
				const currentSize = parseFloat(window.getComputedStyle(historyDiv).fontSize);
				historyDiv.style.fontSize = (currentSize + 1) + 'px';
			});

		const decreaseButton = new ButtonComponent(buttonDiv)
			.setButtonText('A ↓')
			.onClick(() => {
				const currentSize = parseFloat(window.getComputedStyle(historyDiv).fontSize);
				if (currentSize > 1) {
					historyDiv.style.fontSize = (currentSize - 1) + 'px';
				}
			});

		// the explanation of this is crazy
		setTimeout(() => {
			(decreaseButton.buttonEl.childNodes[0] as HTMLElement).style.fontSize = '0.6em';
		}, 0);
	}

	private async answerInteraction(historyDiv: HTMLDivElement) {
		const message = this.chatBox.getValue();
		this.chatHistory.addMessage('Q: ' + message);
		this.updateChatHistory(historyDiv);
		this.chatBox.setValue('');

		const answer = await this.docStore.answer(message);
		if (answer.response) {
			this.chatHistory.addMessage('A: ' + answer.response);
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
						input.setValue(message.slice(5));
						input.inputEl.addEventListener('keydown', async (event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								const newMessage = input.getValue();
								this.chatHistory.addMessage('Q: ' + newMessage);
								historyDiv.empty();
								const answer = await this.docStore.answer(newMessage);
								this.chatHistory.addMessage('A: ' + answer.response);
								this.updateChatHistory(historyDiv);
							}
						});
					});
				editButton.buttonEl.addClass('edit-button');
			} else if (message.startsWith('A:')) {
				messageDiv.createEl('b', { text: 'A: ' + message.slice(2), cls: 'answer' });
			}
		}
	}
	async onClose() {
		// Clean up if necessary
	}
}
