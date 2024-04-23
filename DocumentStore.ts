import AiChat from './main';
import {App, Notice, TFile} from 'obsidian';

import {
	Document,
	Metadata,
	Ollama,
	OllamaEmbedding,
	Response,
	RetrieverQueryEngine,
	Settings,
	VectorStoreIndex
} from 'llamaindex';

export class DocumentStore {
    private app: App;
    private readonly plugin: AiChat;
    private index: VectorStoreIndex;
    private queryEngine : RetrieverQueryEngine;
    private storageContext: any;
    private storagePath: string;
	private statusBar: HTMLElement;
    // private nodePostprocessor: BaseNodePostprocessor;

    constructor(app: App, plugin: AiChat, storagePath: string, statusBar: HTMLElement) {
      this.app = app;
      this.plugin = plugin;
      this.storagePath = storagePath;
	  this.statusBar = statusBar;
     }
  
    async onload() {
    }

    onunload() {
    }

	public async addDocumentPath(filePath: string): Promise<number> {
		// Create a span element for the loading icon
		const loadingIcon = document.createElement('span');
		loadingIcon.innerText = '.';
		loadingIcon.id = 'loading-icon'; // Add an id to the loading icon
		loadingIcon.classList.add('loading-icon');

		// Add the title attribute to the loading icon
		loadingIcon.setAttribute('title', 'Indexing in progress');

		// Add the loading icon to the status bar
		this.statusBar.appendChild(loadingIcon);

		const result = await this.addTfile(this.app.vault.getAbstractFileByPath(filePath) as TFile);

		// Remove the loading icon from the status bar
		this.statusBar.removeChild(loadingIcon);

		return result;
	}

	public preprocessDocumentText(text: string): string {
		if (this.plugin && this.plugin.settings && this.plugin.settings.stripUrls) {
			// Use a regular expression to remove URLs from the text
			new Notice("indexing with urls stripped out")
			return text.replace(/(https?:\/\/(.)*)/g, '');
		} else {
			new Notice("indexing with urls included")
			return text;
		}
	}

	public async convertTFileToLlamaIndexDocument(file: TFile): Promise<Document> {
		let fileContent: string = await this.app.vault.read(file);
		fileContent = this.preprocessDocumentText(fileContent);
		return new Document({ text: fileContent });
	}

    public async initializeIndex(llamaDocument: Document): Promise<void> {
      Settings.llm = new Ollama({ model: "llama2" });
      Settings.embedModel = new OllamaEmbedding({ model: "llama2" });
      this.index = await VectorStoreIndex.fromDocuments([llamaDocument]);
      this.queryEngine = this.index.asQueryEngine();
	    console.log("Index initialized");
    }

    public async getTotalNumberOfIndexedDocuments(): Promise<number> {
		if (this.index) {
			const docRecord = await this.index.docStore.getAllDocumentHashes();
			const documentList = Object.keys(docRecord);
			console.log("retrieved document list from the vector index : ", documentList);
			return documentList.length;
		}
        return 0;
    }
  
    public async addTfile(file: TFile): Promise<number> {
		//if no index then initialize it
		const llamaDocument = await this.convertTFileToLlamaIndexDocument(file);
		if (!this.index) {
			new Notice("No index found. Initializing index with the first document.");
			await this.initializeIndex(llamaDocument);
		} else {
			new Notice("Index found. Inserting document into index...");
			await this.index.insert(llamaDocument);
		}
		this.queryEngine = this.index.asQueryEngine();
		console.log("inserted llamaDocument into index")
		return this.getTotalNumberOfIndexedDocuments();
	}

    public async answer(prompt: string): Promise<Response> {
		if (!this.queryEngine) {
			new Notice("No documents indexed yet. Please index some documents first.");
			return new Response("No documents indexed yet. Please index some documents first.");
		}
		const response = this.queryEngine.query({ query: prompt });
		return response;
    }
   }
