import {App, Modal, TextComponent, ButtonComponent} from 'obsidian';

export class ChatBox extends Modal {
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