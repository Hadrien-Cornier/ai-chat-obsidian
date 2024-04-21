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

		// Add event listener to update chat history when a new message is sent
		this.chatBox.inputEl.addEventListener('change', () => {
			const message = this.chatBox.getValue();
			this.chatHistory.addMessage(message);
			historyDiv.setText(this.chatHistory.getHistory());
			this.chatBox.setValue('');
		});

		// Create submit button
		const submitButton = new ButtonComponent(container as HTMLElement)
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
		const increaseButton = new ButtonComponent(container as HTMLElement)
			.setButtonText('A ↑')
			.onClick(() => {
				const currentSize = parseFloat(window.getComputedStyle(historyDiv).fontSize);
				historyDiv.style.fontSize = (currentSize + 1) + 'px';
			});

		const decreaseButton = new ButtonComponent(container as HTMLElement)
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
		this.chatHistory.addMessage('User: ' + message);
		const answer = await this.docStore.answer(message);
		this.chatHistory.addMessage('AI: ' + answer.response);
		this.updateChatHistory(historyDiv);
		this.chatBox.setValue('');
	}

	updateChatHistory(historyDiv: HTMLElement) {
		historyDiv.empty();
		const messages = this.chatHistory.getHistory().split('\n');
		for (let message of messages) {
			const span = historyDiv.createSpan();
			if (message.startsWith('User:')) {
				span.innerHTML = `<b style="color: blue;">Q: ${message.slice(5)}</b><br/>`;
			} else if (message.startsWith('AI:')) {
				span.innerHTML = `<b style="color: purple;">A: ${message.slice(3)}</b><br/>`;
			}
		}
	}
	async onClose() {
		// Clean up if necessary
	}
}
