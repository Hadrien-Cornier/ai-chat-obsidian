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
				const message = this.chatBox.getValue();
				this.chatHistory.addMessage('User: ' + message);
				const answer = await this.docStore.answer(message);
				this.chatHistory.addMessage('AI: ' + answer.response);
				historyDiv.setText(this.chatHistory.getHistory());
				this.chatBox.setValue('');
			});

		// Add event listener to submit question when enter is pressed
		this.chatBox.inputEl.addEventListener('keydown', async (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				const message = this.chatBox.getValue();
				this.chatHistory.addMessage('User: ' + message);
				const answer = await this.docStore.answer(message);
				this.chatHistory.addMessage('AI: ' + answer.response);
				historyDiv.setText(this.chatHistory.getHistory());
				this.chatBox.setValue('');
			}
		});
	}

	async onClose() {
		// Clean up if necessary
	}
}
