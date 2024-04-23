import {App, Modal, TextComponent, ButtonComponent} from 'obsidian';
import {DocumentStore} from './DocumentStore';
import AiChat from './main';

export class ChatHistory {
	private messages: string[] = [];

	addMessage(message: string) {
		this.messages.push(message);
	}

	getHistory(): string[] {
		return this.messages;
	}
}
export class ChatBox extends Modal {
    private input: TextComponent;
    private output: HTMLDivElement;
    private docStore: DocumentStore;
    private plugin: AiChat;

    constructor(app: App, plugin:AiChat) {
        super(app);
        this.plugin = plugin
        this.docStore = this.plugin.documentStore
    }

    onOpen() {
        let {contentEl} = this;
        contentEl.empty();
        contentEl.createEl('h1', {text: 'Ask Me Anything'});

        this.input = new TextComponent(contentEl)
            .setPlaceholder('Type your question here...')

        contentEl.createEl('br');
        this.output = contentEl.createDiv();
        this.output.addClass('chat-output');

        const submitButton = new ButtonComponent(contentEl)
            .setButtonText('Ask')
            .onClick(async () => {
                this.input.inputEl.dispatchEvent(new Event('change'));
				console.log("Asking question: " + this.input.getValue());
                let answer = await this.answer(this.input.getValue());
                this.output.setText(answer);
            });
        contentEl.createEl('br');
    }

    async answer(prompt: string) : Promise<string> {
        // const response = await query
        const response = await this.docStore.answer(prompt);
		console.log("CHATBOX : response from query engine: ", response);
        return response.response;
    }    


    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}
