import {App, Modal, TextComponent, ButtonComponent} from 'obsidian';
import {DocumentStore} from './DocumentStore';
import AiChat from 'main';

export class ChatBox extends Modal {
    private input: TextComponent;
    private output: HTMLDivElement;
    private docStore: DocumentStore;
    private plugin: AiChat;
    private openAIApiKey: string;

    constructor(app: App, plugin:AiChat) {
        super(app);
        this.plugin = plugin
        this.docStore = this.plugin.documentStore
        this.openAIApiKey = this.plugin.settings.OpenAIKey
    }

    onOpen() {
        let {contentEl} = this;

        contentEl.empty();

        contentEl.createEl('h1', {text: 'Ask Me Anything'});

        this.input = new TextComponent(contentEl)
            .setPlaceholder('Type your question here...')
            .onChange(async (value) => {

                let query: string = "";
                // capture the intent of the question before sending out a RAG request
                // run a language model in tfjs to capture the intent of the question
                // we can't. Maybe we can ask for an OpenAPI key from the user and use that 
                // to send a request to a language model API

                let ragResults : {filePath: string;similarity: number;documentText: string;} = this.docStore.similaritySearch(query);
                
                //here use the rag results 

                this.setOutputText(`return the output`);
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