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

    // private storagePath: string;
    // private knn: any;

    // private filePathToDoc: { [key: string]: BasicDocument };
    // private indexToDoc : { [key: number]: BasicDocument };

    // private embeddedChunks: tf.Tensor2D;
    // private pointerStartOfDocId: number[];
    // private docIdsMarkedForDeletion: Set<number>;

    // private maxDocId: number = -1;
    // private maxChunkId: number = -1;
    // private chunkSize: number;
    // private overlap: number;

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

    public async initalizeIndex(): Promise<void> {
      this.index = await VectorStoreIndex.init({});
      this.queryEngine = this.index.asQueryEngine();
    }

    public async getTotalNumberOfIndexedDocuments(): Promise<number> {
      return this.index.;
    }
  
    public async addTfile(file: TFile): Promise<void> {
        //if no index then initialize it
        if (!this.index) {
          await this.initalizeIndex();
        }
        const llamaDocument = await this.convertTFileToLlamaIndexDocument(file);
        this.index.insert(llamaDocument);
        this.queryEngine = this.index.asQueryEngine();
        // this.queryEngine.nodePostprocessors = [this.nodePostprocessor];
    }

    public loadIndexFromStorage(storageContext: any): PromiseLike<VectorStoreIndex> {
      return VectorStoreIndex.init({storageContext: storageContext});
    }

    // public async removeDocumentPath(filePath: string): Promise<void> {
    //   this.removeDocument(this.app.vault.getAbstractFileByPath(filePath) as TFile);
    // }

    // public async removeDocument(file: TFile): Promise<void> {
    //   const currentDocument: BasicDocument = this.filePathToDoc[file.path];
    //   if (currentDocument != undefined) {
    //     this.docIdsMarkedForDeletion.add(currentDocument.id);
    //     this.knn.clearClass(currentDocument.id);
    //     console.log(`Removed document: ${file.name}`);
    //   }
    //   else {
    //     console.log(`Skipping Remove because Document: ${file.name} does not exist in the document store`);
    //   }
    };

    //remove all documents
    // public async clear(): Promise<void> {
    //   this.knn.clearAllClasses();
    //   this.embeddedChunks = tf.tensor2d([], [0, 0]);
    //   this.pointerStartOfDocId = [];
    //   this.docIdsMarkedForDeletion = new Set();
    //   this.maxDocId = -1;
    //   this.maxChunkId = -1;
    //   this.filePathToDoc = {};
    //   this.indexToDoc = {};
    //   // this.wipeDataFromDisk();
    //   console.log('Cleared the document store');
    // }


    // private async garbageCollect(): Promise<void> {
    //   // TODO call this periodically to shift around the pointer values to remove the gaps
    //   // we cannot update a modified file in place easily because it might have more chunks than before and overlap
    //   // with the next file, so the robust way is to delete the old one and index the new and the GC
    //   // will take care of cleaning up the gaps
    // }

  
    // private *chunkText(text: string): IterableIterator<DocumentChunk> {
    //     let startPos = 0;
    //     while (startPos < text.length) {
    //         const endPos: number = Math.min(startPos + this.chunkSize, text.length);
    //         const chunkText: string = text.substring(startPos, endPos);
    //         this.maxChunkId += 1;
    //         startPos += this.chunkSize - this.overlap;
    //         yield { id: this.maxChunkId, text: chunkText};
    //     }
    // }

    // public getChunkText(chunkId: number): Promise<string> {
    //   return new Promise((resolve, reject) => {
    //     // Iterate through the pointer array to find the document that contains the chunk
    //     // then do math on the document to find the chunk
    //     for (let i = 0; i < this.pointerStartOfDocId.length; i++) {
    //       if (this.pointerStartOfDocId[i] > chunkId) {
    //         const docId: number = i - 1;
    //         const currentDocument: BasicDocument = this.indexToDoc[docId];
    //         const start: number = this.pointerStartOfDocId[docId];
    //         const chunkIndex: number = chunkId - start;
    
    //         this.app.vault.read(currentDocument.file).then((fileContent) => {
    //           const chunks : Array<DocumentChunk> = Array.from(this.chunkText(fileContent));
    //           if (chunkIndex < chunks.length) {
    //             resolve(chunks[chunkIndex].text);
    //           } else {
    //             reject(new Error("Chunk index out of bounds"));
    //           }
    //         });
    //         return;
    //       }
    //     }
    //     reject(new Error("No document contains the specified chunkId"));
    //   });
    // }

    // public async similaritySearch(query: string, topK: number = 5): Promise<Array<SimilarityResult>> {
    //   const queryVector: tf.Tensor2D = await this.encodeStringToVector(query)
    //   const totalNumberOfDocuments: number = this.maxDocId - this.docIdsMarkedForDeletion.size;
    //   const nn : {label: string, classIndex: number, confidences: {[classId: number]: number}} = await this.knn.predictClass(queryVector, topK);
    //   const confidences : {[classId: number]: number} = nn.confidences;
    //   let results: Array<{filePath: string, similarity: number, documentText: string}> = [];
    //   Object.keys(confidences).forEach(async classId => {
    //     const id: number = parseInt(classId);
    //     console.log(`classId: ${classId}, confidence: ${confidences[id]}`);
    //     results.push({filePath: this.indexToDoc[id].file.path, similarity: confidences[id], documentText: await this.app.vault.read(this.indexToDoc[id].file)});
    //   });

    //   return results;

    // }


// TODO : WE WILL BE USING preFilters to filter Obsidian documents based on their tags !! 


// import { VectorStoreIndex, VectorIndexAutoRetriever, MetadataInfo, VectorStoreInfo } from 'llamaindex';

// // Define metadata information for documents
// const vectorStoreInfo = new VectorStoreInfo({
//   content_info: "Document content",
//   metadata_info: [
//     new MetadataInfo("category", "The category of the document", "string"),
//     new MetadataInfo("author", "The author of the document", "string"),
//   ],
// });

// // Initialize the auto retriever with the vector store information
// const retriever = new VectorIndexAutoRetriever(index, { vectorStoreInfo });

// // Perform the retrieval with preFilters
// const response = retriever.retrieve("Latest research papers in AI", {
//   preFilters: {
//     category: 'AI Research'
//   }
// });

// console.log(response);