import { ItemView, WorkspaceLeaf, TextComponent, ButtonComponent, Notice } from 'obsidian';
import { ChatHistory } from '../services/ChatHistory';
import { DocumentStore } from '../services/DocumentStore';
import AiChat from '../main';

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
        this.docStore = this.plugin.documentStore;
        const container = this.containerEl.children[1];
        container.empty();
        const historyDiv = container.createDiv();
        this.updateChatHistory(historyDiv);

        this.chatBox = new TextComponent(container as HTMLElement);
        this.chatBox.setPlaceholder('Type Question For ' + this.plugin.settings.modelName + ' ⏎');
        this.chatBox.inputEl.style.width = '100%';
        this.chatBox.inputEl.addClass('chat-box');

        const buttonDiv = container.createDiv();

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

        const saveButton = new ButtonComponent(container as HTMLElement)
            .setButtonText('Save Conversation')
            .onClick(async () => {
                const messages = this.chatHistory.getHistory();
                if (messages.length > 0) {
                    const conversation = messages.join('\n');
                    const filePath = '/path/to/conversation/file.md';
                    await this.plugin.app.vault.create(filePath, conversation);
                    new Notice('Conversation saved');
                }
            });
    }

    private async answerInteraction(historyDiv: HTMLDivElement) {
        const message = this.chatBox.getValue();
        this.chatHistory.addMessage('Q: ' + message);
        this.updateChatHistory(historyDiv);
        this.chatBox.setValue('');

        const loadingBar = historyDiv.createDiv({ cls: 'loading-bar' });
        loadingBar.setText('Loading...');
        const answer = await this.docStore.answer(message);
        if (answer.response) {
            this.chatHistory.addMessage(this.plugin.settings.modelName + ': ' + answer.response);
            this.updateChatHistory(historyDiv);
        }
        loadingBar.remove();
    }

    updateChatHistory(historyDiv: HTMLElement) {
        historyDiv.empty();
        const messages = this.chatHistory.getHistory();
        let i = 0;
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
                                this.chatHistory.addMessage(this.plugin.settings.modelName + ': ' + answer.response);
                                this.updateChatHistory(historyDiv);
                            }
                        });
                    });
                editButton.buttonEl.addClass('edit-button');
            } else {
                messageDiv.createEl('b', { text: this.plugin.settings.modelName + ': ' + message.slice((this.plugin.settings.modelName + ':').length), cls: 'answer' });
            }
        }
    }

    async onClose() {
        // Clean up if necessary
    }
}