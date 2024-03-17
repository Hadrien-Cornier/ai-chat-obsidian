import {App, Modal, Notice, TextComponent, ButtonComponent} from 'obsidian';
import {DocumentStore} from './DocumentStore';
import AiChat from 'main';
import { SimilarityResult } from 'types';
import ollama from 'ollama'
////////////////////////////////////////////////////////////////////////
// Export the OLLAMA_ORIGINS environment variable with a value of 
// "app://obsidian.md*"
// we need this because otherwise we would be blocked by CORS
console.log('export let OLLAMA_ORIGINS');
export let OLLAMA_ORIGINS = 'app://obsidian.md*';
////////////////////////////////////////////////////////////////////////
//  After setting this, make sure to kill ollama and restart it
//  `pkill ollama` 
//  `ollama serve`
////////////////////////////////////////////////////////////////////////
// Define the async function to query an API


// we are using the ollama JS API to query the ollama server
async function queryOllama(prompt: string): Promise<string> {
    try {
        console.log('querying ollama using the ollama JS API');
        const response = await ollama.chat({
        model: 'llama2',
        messages: [{ role: 'user', 
        content: prompt }],
        })
        return response.message.content;
    } catch (error) {
        console.error('Error:', error);
        throw error; // Re-throw the error after logging it
    }
}

function ultimateReply(ragResults:string, prompt:string) : string {
    const template: string = `Given the following Documents and Original user query, please formulate a response to the user incorporating the document information \n Q : ${intent} \n###\n Documents : ${ragResults}`;
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

        // Now we get the documents that are relevant to the intent
        let ragResults : SimilarityResult[] = await this.docStore.similaritySearch(question);
        console.log(ragResults);
        // new Notice('answer : ragResults ! ' + ragResults);
        let resultPrompt: string = mapAndConcat(ragResults, convertSimlarityResultToPrompt) ;
        // do a final prompt to extract the answer
        let reply: string = await queryOllama(ultimateReply(resultPrompt, question)); ;
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