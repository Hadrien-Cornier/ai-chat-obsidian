import AiChat from './main';
import { Notice } from 'obsidian';
import { App, TFile } from 'obsidian';
// import * as use from '@tensorflow-models/universal-sentence-encoder';
// @ts-ignore
// const punycode = require('punycode/');
import { Ollama, Settings, Document,Response, Metadata, RetrieverQueryEngine, VectorStoreIndex, storageContextFromDefaults, CohereRerank, BaseNodePostprocessor, OllamaEmbedding } from 'llamaindex';
// import { OllamaLLM, OllamaEmbedding } from './OllamaModels';

export class DocumentStore {

    // Very simple document store using tensorflow.js WebGL accelerated KNN classifier and text embeddings
    // they run within the "browser" of the obsidian app
    private app: App;

    private plugin: AiChat;

    private index: VectorStoreIndex;
    private queryEngine : RetrieverQueryEngine;
    private storageContext: any;
    private storagePath: string;
    // private nodePostprocessor: BaseNodePostprocessor;

    constructor(app: App, plugin: AiChat, storagePath: string, chunkSize: number = 10000, overlap: number = 0, modelName: string = 'llama2') {
      this.app = app;
      this.plugin = plugin;
      this.storagePath = storagePath;

      // const ollamaBaseUrl = 'http://localhost:11434'; // Adjust as necessary
      // const llm = new OllamaLLM(ollamaBaseUrl);

      // const serviceContext = {
      //     llmPredictor: llm,
      //     embedModel: embedding
      // };

      // const vectorStoreIndex = VectorStoreIndex.fromDocuments(documents, serviceContext);
      // this.nodePostprocessor = new CohereRerank({ apiKey: process.env.COHERE_API_KEY ?? null, topN: 4 });
    }
  
    async onload() {
      // this.storageContext = await storageContextFromDefaults({persistDir: this.storagePath});
      // this.index = await this.loadIndexFromStorage(this.storageContext);
      // this.queryEngine = this.index.asQueryEngine();
    }

    onunload() {
    }

    public async persistToDisk(): Promise<void> {
      }

    public async addDocumentPath(filePath: string): Promise<number> {
      return await this.addTfile(this.app.vault.getAbstractFileByPath(filePath) as TFile);
    }

    public async convertTFileToLlamaIndexDocument(file: TFile): Promise<Document<Metadata>> {
      const fileContent: string = await this.app.vault.read(file);
      return new Document({ text: fileContent });
    }

    public async createLlamaVectorStoreFromTFiles(files: TFile[]): Promise<VectorStoreIndex> {
      const llamaFiles = await Promise.all(files.map(async (file) => this.convertTFileToLlamaIndexDocument(file)));
      const index = await VectorStoreIndex.fromDocuments(llamaFiles);
      return index;
    }

    public async initalizeIndex(llamaDocument: Document): Promise<void> {
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
			console.log("retrieved document list from the vector index")
			return documentList.length;
		}
        return 0;
    }
  
    public async addTfile(file: TFile): Promise<number> {
		//if no index then initialize it
		const llamaDocument = await this.convertTFileToLlamaIndexDocument(file);
		if (!this.index) {
			await this.initalizeIndex(llamaDocument);
		}
		await this.index.insert(llamaDocument);
		this.queryEngine = this.index.asQueryEngine();
		console.log("inserted llamaDocument into index")
		return this.getTotalNumberOfIndexedDocuments();
	}

    public loadIndexFromStorage(storageContext: any): PromiseLike<VectorStoreIndex> {
      return VectorStoreIndex.init({storageContext: storageContext});
    }

    public async answer(prompt: string): Promise<Response> {
		if (!this.queryEngine) {
			new Notice("No documents indexed yet. Please index some documents first.");
			return new Response("No documents indexed yet. Please index some documents first.");
		}
      return this.queryEngine.query({ query: prompt });
    }
   };
