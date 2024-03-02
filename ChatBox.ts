import {App, Modal, Notice, TextComponent, ButtonComponent} from 'obsidian';
import {DocumentStore} from './DocumentStore';
import AiChat from 'main';
import { SimilarityResult } from 'types';

async function queryOpenAI(apiKey: string, prompt: string) {
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "llama2",
            prompt: prompt,
            max_tokens: 60
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].text.trim();
}

// function that wraps a prompt and modifies it through a template that injects static text with the prompt
// will be called for the intent detection
function promptOfIntentDetection(prompt: string): string {
    const template: string = `You are a job search assitant, your goal is to extract the intent of the following question : ${prompt} . Your response should be a short sentence that captures the intent of the question.`;
    return template;
}

function ultimateReply(intent:string, ragResults:string, prompt:string) : string {
    const template: string = `Given the following Intent and the documents searched and Original user query, please formulate a response to the user incorporating the document information \n Intent : ${intent} \n Documents : ${ragResults} \n User Query : ${prompt}`;
    return template;
}

function convertSimlarityResultToPrompt(document: SimilarityResult): string {
    return `Document : ${document.filePath} \n Similarity : ${document.similarity} \n Text : \n ${document.documentText} \n ___` ;
}

//function that wraps a string-string function and allows us to map it to an array and then concatenate the results
function mapAndConcat<T>(arr: Array<T>, f: (x: T) => string): string {
    return arr.map(f).join('\n');
}

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
            // .onChange(async (value) => {

            //     let query: string = "";
            //     // capture the intent of the question before sending out a RAG request
            //     // run a language model in tfjs to capture the intent of the question
            //     // we can't. Maybe we can ask for an OpenAPI key from the user and use that 
            //     // to send a request to a language model API


            //     // CHAT BOT NUMBER 1 WITH INTENT DETECTION
            //     // here we can use the openAI API to get the intent of the question

            // });

        contentEl.createEl('br');

        const submitButton = new ButtonComponent(contentEl)
            .setButtonText('Ask')
            .onClick(() => {
                // Simulate asking a question
                this.input.inputEl.dispatchEvent(new Event('change'));
                this.answer(this.input.getValue());
            });

        this.output = contentEl.createDiv();
        this.output.addClass('chat-output');
    }


    private async answer(question: string): Promise<void> {
        new Notice('This is a notice that we are answering!');
        let intent: string = await queryOpenAI(this.openAIApiKey, promptOfIntentDetection(question));
        console.log(intent);
        
        new Notice('answer : intent detected ! ' + intent);


        // Now we get the documents that are relevant to the intent
        let ragResults : SimilarityResult[] = await this.docStore.similaritySearch(intent);
        console.log(ragResults);
        new Notice('answer : ragResults ! ' + ragResults);
        let resultPrompt: string = mapAndConcat(ragResults, convertSimlarityResultToPrompt) ;
        // do a final prompt to extract the answer
        let reply: string = ultimateReply(intent, resultPrompt, question);

        new Notice('answer : reply ! ' + reply);

        // TODO : for now this does not support streaming I believe
        this.setOutputText(reply);
    }

    private setOutputText(text: string): void {
        this.output.setText(text);
    }

    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}