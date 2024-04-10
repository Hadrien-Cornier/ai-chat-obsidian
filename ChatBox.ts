import {App, Modal, Notice, TextComponent, ButtonComponent} from 'obsidian';
import {DocumentStore} from './DocumentStore';
import AiChat from 'main';
////////////////////////////////////////////////////////////////////////
// Export the OLLAMA_ORIGINS environment variable with a value of 
// "app://obsidian.md*"
// we need this because otherwise we would be blocked by CORS
// console.log('export let OLLAMA_ORIGINS');
// export let OLLAMA_ORIGINS = 'app://obsidian.md*';
// ////////////////////////////////////////////////////////////////////////
// //  After setting this, make sure to kill ollama and restart it
// //  `pkill ollama` 
// //  `ollama serve`
// ////////////////////////////////////////////////////////////////////////
// // Define the async function to query an API


// // we are using the ollama JS API to query the ollama server
// async function queryOllama(prompt: string): Promise<string> {
//     try {
//         console.log('querying ollama using the ollama JS API');
//         const response = await ollama.chat({
//         model: 'llama2',
//         messages: [{ role: 'user', 
//         content: prompt }],
//         })
//         return response.message.content;
//     } catch (error) {
//         console.error('Error:', error);
//         throw error; // Re-throw the error after logging it
//     }
// }

// function ultimateReply(ragResults:string, prompt:string) : string {
//     const template: string = `Given the following Documents and Original user query, please formulate a response to the user incorporating the document information \n Q : ${intent} \n###\n Documents : ${ragResults}`;
//     return template;
// }

// function convertSimlarityResultToPrompt(document: SimilarityResult): string {
//     return `Document : ${document.filePath} \n Similarity : ${document.similarity} \n Text : \n ${document.documentText} \n ___` ;
// }

// //function that wraps a string-string function and allows us to map it to an array and then concatenate the results
// function mapAndConcat<T>(arr: Array<T>, f: (x: T) => string): string {
//     return arr.map(f).join('\n');
// }

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

        // const submitButton = new ButtonComponent(contentEl)
        //     .setButtonText('Ask')
        //     .onClick(() => {
        //         // Simulate asking a question
        //         this.input.inputEl.dispatchEvent(new Event('change'));
        //         this.answer(this.input.getValue());
        //     });
        contentEl.createEl('br');

        this.output = contentEl.createDiv();
        this.output.addClass('chat-output');
    }




    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}