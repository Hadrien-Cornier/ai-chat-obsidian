import AiChat from './main';
import { Notice } from 'obsidian';
import { App, TFile } from 'obsidian';
// import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as tf from '@tensorflow/tfjs';
// @ts-ignore
// const punycode = require('punycode/');
import { Document, Metadata, RetrieverQueryEngine, VectorStoreIndex, storageContextFromDefaults, CohereRerank, BaseNodePostprocessor } from 'llamaindex';

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
      // this.nodePostprocessor = new CohereRerank({ apiKey: process.env.COHERE_API_KEY ?? null, topN: 4 });
    }
  
    async onload() {
      this.storageContext = await storageContextFromDefaults({persistDir: this.storagePath});
      this.index = await this.loadIndexFromStorage(this.storageContext);
      this.queryEngine = this.index.asQueryEngine();
    }

    onunload() {
    }

    public async persistToDisk(): Promise<void> {
      }

    public addDocumentPath(filePath: string): void {
      this.addTfile(this.app.vault.getAbstractFileByPath(filePath) as TFile);
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
      this.index = await VectorStoreIndex.fromDocuments([llamaDocument]);
      this.queryEngine = this.index.asQueryEngine();
    }

    public async getTotalNumberOfIndexedDocuments(): Promise<number> {
      return Promise.resolve(0);
    }
  
    public async addTfile(file: TFile): Promise<void> {
        //if no index then initialize it
        const llamaDocument = await this.convertTFileToLlamaIndexDocument(file);
        if (!this.index) {
          await this.initalizeIndex(llamaDocument);
        } else {
          this.index.insert(llamaDocument);
        }
        this.queryEngine = this.index.asQueryEngine();
    }

    public loadIndexFromStorage(storageContext: any): PromiseLike<VectorStoreIndex> {
      return VectorStoreIndex.init({storageContext: storageContext});
    }

    public async query(query: string): Promise<string> {
      return (await this.queryEngine.query({ query: query })).response;
    }
   };