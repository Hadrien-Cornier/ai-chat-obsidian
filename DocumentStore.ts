import AiChat from './main';
import {App, Notice, TFile, Vault} from 'obsidian';
import {
	AgentChatResponse,
	Document,
	Ollama,
	OllamaEmbedding, QueryEngineTool, ReActAgent,
	Response,
	RetrieverQueryEngine,
	Settings, StorageContext, storageContextFromDefaults,
	VectorStoreIndex,
} from 'llamaindex';
import {GenericFileSystem} from '@llamaindex/env';
import {DocStoreStrategy} from "./types";

const maxWords = 2000;

export class DocumentStore {
	private app: App;
	private readonly plugin: AiChat;
	private index: VectorStoreIndex;
	private queryEngine: RetrieverQueryEngine;
	private storageContext: StorageContext;
	private readonly storagePath: string;
	private statusBar: HTMLElement;
	private readonly fileSystem: ObsidianFileSystem;
	private agent: ReActAgent;

	constructor(app: App, plugin: AiChat, statusBar: HTMLElement, storagePath: string = "./_storage_") {
		this.app = app;
		this.plugin = plugin;
		this.storagePath = storagePath;
		this.statusBar = statusBar;
		this.fileSystem = new ObsidianFileSystem(this.app.vault);
		Settings.llm = new Ollama({model: this.plugin.settings.modelName});
		Settings.embedModel = new OllamaEmbedding({model: this.plugin.settings.modelName});
		Settings.callbackManager.on("llm-tool-call", (event) => {
			console.log(event.detail.payload);
		});
	}

	async onload() {
		// @ts-ignore
		await this.fileSystem.mkdir(this.storagePath, {recursive: true});
		this.storageContext = await storageContextFromDefaults({persistDir: this.storagePath, fs: this.fileSystem});
		await this.loadFromIndex();

		// Settings.callbackManager.on("llm-tool-result", (event) => {
		// 	console.log(event.detail.payload);
		// });
		this.initializeAgent();

	}

	private initializeAgent() {
		this.queryEngine = this.index.asQueryEngine();
        // the agent can choose to retrieve more info or not
		const tools = [
			new QueryEngineTool({
				queryEngine: this.queryEngine,
				metadata: {
					name: "note-reading-tool",
					description: `This tool can answer questions about the contents of notes.`,
				},
			}),
		];
		this.agent = new ReActAgent({tools});
	}

	public async loadFromIndex(): Promise<void> {
		new Notice("Loading ...")
		// @ts-ignore
		const newStorageContext = await storageContextFromDefaults({persistDir: this.storagePath, fs: this.fileSystem});
		this.index = await VectorStoreIndex.init({storageContext: newStorageContext});
		new Notice("Loaded From Index : " + this.storagePath)
	}

	public async addDocumentPath(filePath: string): Promise<number> {
		const loadingIcon = document.createElement('span');
		loadingIcon.innerText = '.';
		loadingIcon.id = 'loading-icon';
		loadingIcon.classList.add('loading-icon');

		loadingIcon.setAttribute('title', 'Indexing in progress');

		this.statusBar.appendChild(loadingIcon);

		const result = await this.addTfile(this.app.vault.getAbstractFileByPath(filePath) as TFile);

		this.statusBar.removeChild(loadingIcon);

		if (filePath === this.app.workspace.getActiveFile().path) {
			this.plugin.ribbonIconElIndex.removeClass('current-file-not-indexed');
			this.plugin.ribbonIconElIndex.addClass('current-file-indexed');
		}

		return result;
	}

	public async addAllDocuments(filePaths: Array<string>): Promise<void> {
		const loadingIcon = document.createElement('span');
		loadingIcon.innerText = '.';
		loadingIcon.id = 'loading-icon';
		loadingIcon.classList.add('loading-icon');
		loadingIcon.setAttribute('title', 'Indexing in progress');
		this.statusBar.appendChild(loadingIcon);
		for (const filePath of filePaths) {
			loadingIcon.innerText = `*`;
			loadingIcon.setAttribute('title', `Indexing ${filePaths.length} files left`);
			await this.addTfile(this.app.vault.getAbstractFileByPath(filePath) as TFile);
			// Check if the indexed file is the active file
			if (filePath === this.app.workspace.getActiveFile().path) {
				this.plugin.ribbonIconElIndex.removeClass('current-file-not-indexed');
				this.plugin.ribbonIconElIndex.addClass('current-file-indexed');
			}
		}

		// Remove the loading icon from the status bar
		this.statusBar.removeChild(loadingIcon);
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
		return new Document({text: fileContent});
	}

	public async initializeIndex(llamaDocument: Document): Promise<void> {
		if (this.storagePath != null) {
			try {
				this.index = await VectorStoreIndex.init({storageContext: this.storageContext});
				await this.index.insert(llamaDocument);
			} catch (e) {
				this.index = await VectorStoreIndex.fromDocuments([llamaDocument], {
					storageContext: this.storageContext,
					logProgress: true,
					docStoreStrategy: DocStoreStrategy.DUPLICATES_ONLY
				});
			}
		} else {
			this.index = await VectorStoreIndex.fromDocuments([llamaDocument], {
				storageContext: this.storageContext,
				logProgress: true,
				docStoreStrategy: DocStoreStrategy.DUPLICATES_ONLY
			});
		}
		this.queryEngine = this.index.asQueryEngine();
		//console.log("Index initialized");
	}

	public async getTotalNumberOfIndexedDocuments(): Promise<number> {
		if (this.index) {
			const docRecord = await this.index.docStore.getAllDocumentHashes();
			const documentList = Object.keys(docRecord);
			//console.log("retrieved document list from the vector index : ", documentList);
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
			console.log("inserted llamaDocument into index")
			console.log(llamaDocument)
		}
		this.queryEngine = this.index.asQueryEngine();
		//console.log("inserted llamaDocument into index")
		return this.getTotalNumberOfIndexedDocuments();
	}

	public async answer(prompt: string): Promise<AgentChatResponse> {
		if (!this.agent){  // this.index && !this.queryEngine) {
			this.initializeAgent();
			//this.queryEngine = this.index.asQueryEngine();
		}
		if (!this.queryEngine) {
			new Notice("No documents indexed yet. Please index some documents first.");
			return new AgentChatResponse("No documents indexed yet. Please index some documents first.");
		}
		const response = this.agent.chat({
			message: prompt,
		})//this.queryEngine.query({query: prompt});
		return response;
	}


	async summarizeTFile(activeFile: TFile) {

		let fileContent: string = await this.app.vault.read(activeFile);

		// Helper function to truncate text to a maximum of 2000 words
		function truncateToMaxWords(text: string, maxWords: number): string {
			let words = text.split(' ');
			if (words.length > maxWords) {
				words = words.slice(0, maxWords);
			}
			return words.join(' ');
		}

		async function generateSummary(fileContent: string) {
			// maybe later we can add orchestration that summarizes chunks and then summarizes the summaries recursively
			var prompt_template = "### Instruction:\n" +
				"Summarize the following text:\n" +
				"\n" +
				"### Text:\n" +
				truncateToMaxWords(fileContent, maxWords) + "\n" +
				"### Summary:\n"

			// Send a request to the Ollama completion endpoint with the text to be summarized
			const response = await fetch('http://localhost:11434/api/generate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'llama2-uncensored',
					prompt: prompt_template,
					stream: false
				})
			});

			// Parse the response as JSON
			const responseData = await response;
			// console.log(responseData);
			const summary = await responseData.text();

			return JSON.parse(summary).response;
		}

		return generateSummary(fileContent);
	}
}


class ObsidianFileSystem implements GenericFileSystem {

	private vault: Vault;

	constructor(vault: Vault) {
		this.vault = vault;
	}

	async access(path: string): Promise<void> {
		const file = this.vault.getAbstractFileByPath(path);
		if (!file) {
			throw new Error(`File ${path} does not exist`);
		}
	}

	// @ts-ignore
	async mkdir(path: string): Promise<void> {
		await this.vault.createFolder(path);
	}

	// @ts-ignore
	async mkdir(path: string, options?: { recursive: boolean }): Promise<string | undefined> {
		let f = this.vault.getAbstractFileByPath(path);
		try {
			f = await this.vault.createFolder(path);
		} catch (e) {
			// this is when it already exists
		}
		return f.path;
	}


	async readRawFile(path: string): Promise<Buffer> {
		const file = this.vault.getAbstractFileByPath(path) as TFile;
		if (!file) {
			throw new Error(`File ${path} does not exist`);
		}
		return Buffer.from(await this.vault.readBinary(file));

	}

	async readFile(path: string, options?: any): Promise<string> {
		const file = this.vault.getAbstractFileByPath(path) as TFile;
		if (!file) {
			throw new Error(`File ${path} does not exist`);
		}
		return await this.vault.read(file);
	}

	async writeFile(path: string, content: string, options?: any): Promise<void> {
		let file = this.vault.getAbstractFileByPath(path) as TFile;
		if (!file) {
			await this.vault.create(path, content);
		} else {
			await this.vault.modify(file, content);
		}
	}

}
