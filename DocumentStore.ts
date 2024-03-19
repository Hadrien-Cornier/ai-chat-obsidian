import AiChat from 'main';
import { Notice } from 'obsidian';
import { App, Plugin, TFile } from 'obsidian';
// import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as tf from '@tensorflow/tfjs';
import { DocumentChunk, Document, SimilarityResult} from 'types';
import { assert } from 'console';
import ollama, { EmbeddingsResponse } from 'ollama'
// @ts-ignore
import * as knnClassifier from '@tensorflow-models/knn-classifier';


export class DocumentStore {

    // Very simple document store using tensorflow.js WebGL accelerated KNN classifier and text embeddings
    // they run within the "browser" of the obsidian app

    private app: App;

    private plugin: AiChat;
    private modelName: string;

    private storagePath: string;
    private knn: any;

    private filePathToDoc: { [key: string]: Document };
    private indexToDoc : { [key: number]: Document };

    private embeddedChunks: tf.Tensor2D;
    private pointerStartOfDocId: number[];
    private docIdsMarkedForDeletion: Set<number>;

    private maxDocId: number = -1;
    private maxChunkId: number = -1;
    private chunkSize: number;
    private overlap: number;


    constructor(app: App, plugin: AiChat, storagePath: string, chunkSize: number = 1000, overlap: number = 200, modelName: string = 'llama2') {
      this.app = app;
      this.plugin = plugin;

      this.knn = knnClassifier.create();
      this.modelName=modelName;

      // Dicts
      this.filePathToDoc = {};
      this.indexToDoc = {};

      // Tensors
      this.embeddedChunks = tf.tensor2d([], [0, 0]);
      this.pointerStartOfDocId = [];
      this.docIdsMarkedForDeletion = new Set();

      // Metadata
      this.maxDocId = -1;
      this.maxChunkId = -1;
      this.chunkSize = chunkSize;
      this.overlap = overlap;
      this.storagePath = storagePath;
    
    }
  
    onload() {
    }

    onunload() {
      this.knn.dispose();
    }

    private async loadFromDisk(): Promise<void> {
      // TODO   
    }

    private async saveJsonToFile(filePath: string, data: any): Promise<void> {
        const fileContent: string = JSON.stringify(data, null, 2);
        await this.app.vault.adapter.write(filePath, fileContent);
      }

    public async persistToDisk(): Promise<void> {

      // classifier.getClassifierDataset()
        try {
          if (!this.app.vault.getAbstractFileByPath(this.storagePath)) {
            await this.app.vault.createFolder(this.storagePath);
          }

          this.garbageCollect();

          //Dicts
          await this.saveJsonToFile(`${this.storagePath}/file_path_to_doc.json`, this.filePathToDoc);
          await this.saveJsonToFile(`${this.storagePath}/index_to_doc.json`, this.indexToDoc);

          //Tensors
          await this.saveJsonToFile(`${this.storagePath}/pointer_start_of_doc_id.json`, this.pointerStartOfDocId);
          await this.saveJsonToFile(`${this.storagePath}/doc_ids_marked_for_deletion.json`, this.docIdsMarkedForDeletion);
          await this.saveTfTensorToFile(`${this.storagePath}/embedded_chunks.bin`, this.embeddedChunks);

          const metadata = {
            maxDocId: this.maxDocId,
            maxChunkId: this.maxChunkId,
            chunkSize: this.chunkSize,
            overlap: this.overlap,
            storagePath: this.storagePath
          };

          //Metadata
          await this.saveJsonToFile(`${this.storagePath}/metadata.json`, metadata);

          new Notice('Data successfully persisted to disk.');
        } catch (error) {
          console.error('Failed to persist data:', error);
          new Notice('Error persisting data to disk.');
        }
      }

    private async wipeDataFromDisk(): Promise<void> {
      await this.app.vault.adapter.remove(this.storagePath);
      await this.app.vault.createFolder(this.storagePath)
      new Notice('Data successfully wiped from disk.');
    }

    
    private async saveTfTensorToFile(filePath: string, tensor: tf.Tensor): Promise<void> {
        tensor.data().then((typedArray) => {
          const buffer: Buffer = Buffer.from(typedArray.buffer);
          this.app.vault.adapter.writeBinary(filePath,buffer);
        });

    }

    public async getOllamaTextEmbedding(input : string) : Promise<number[]> {
         var response: EmbeddingsResponse = await ollama.embeddings({prompt: input, model: 'llama2'})
         return response.embedding;
    }

    private async encodeStringToVector(text: string): Promise<tf.Tensor2D> {
      const ollamaResponse : number[] = await this.getOllamaTextEmbedding(text)
      console.log("ollamaResponse is : ")
      console.log(ollamaResponse)
      const embeddings: tf.Tensor2D = tf.tensor2d(ollamaResponse, [1, ollamaResponse.length]);
      return embeddings;
    }

    public addDocumentPath(filePath: string): void {
      this.addDocument(this.app.vault.getAbstractFileByPath(filePath) as TFile);
    }
  
    public async addDocument(file: TFile): Promise<number> {
        const fileContent: string = await this.app.vault.read(file);
        const chunks: IterableIterator<DocumentChunk> = this.chunkText(fileContent);
        let chunkIndex: number = 0;
        let isFirstChunk: boolean = true;

        this.maxDocId += 1;
                
        const currentDocument: Document = {id: this.maxDocId, file, pointer: this.embeddedChunks.shape[0]};

        this.filePathToDoc[file.path] = currentDocument;
        this.indexToDoc[this.maxDocId] = currentDocument;
        
        // add currentDocument.pointer to the pointer array
        this.pointerStartOfDocId.push(currentDocument.pointer);
    
        for await (const {id, text} of chunks) {
            this.maxChunkId += 1;
            const vector: tf.Tensor2D = await this.encodeStringToVector(text);
            console.log("vector has been inferred, the shape is : ")
            console.log(vector.shape)
            this.knn.addExample(vector, this.maxDocId);
            if (this.embeddedChunks === undefined || this.embeddedChunks.shape[0] === 0) {
                this.embeddedChunks = vector.clone();
            } else {
                this.embeddedChunks = tf.concat([this.embeddedChunks, vector], 0);
            }
            chunkIndex++;
        }
        console.log(`Added ${chunkIndex} chunks from document: ${file.name}`);
        return chunkIndex;
    }

    public async removeDocumentPath(filePath: string): Promise<void> {
      this.removeDocument(this.app.vault.getAbstractFileByPath(filePath) as TFile);
    }

    public async removeDocument(file: TFile): Promise<void> {
      const currentDocument: Document = this.filePathToDoc[file.path];
      if (currentDocument != undefined) {
        this.docIdsMarkedForDeletion.add(currentDocument.id);
        this.knn.clearClass(currentDocument.id);
        console.log(`Removed document: ${file.name}`);
      }
      else {
        console.log(`Skipping Remove because Document: ${file.name} does not exist in the document store`);
      }
    }

    //remove all documents
    public async clear(): Promise<void> {
      this.knn.clearAllClasses();
      this.embeddedChunks = tf.tensor2d([], [0, 0]);
      this.pointerStartOfDocId = [];
      this.docIdsMarkedForDeletion = new Set();
      this.maxDocId = -1;
      this.maxChunkId = -1;
      this.filePathToDoc = {};
      this.indexToDoc = {};
      // this.wipeDataFromDisk();
      console.log('Cleared the document store');
    }


    private async garbageCollect(): Promise<void> {
      // TODO call this periodically to shift around the pointer values to remove the gaps
      // we cannot update a modified file in place easily because it might have more chunks than before and overlap
      // with the next file, so the robust way is to delete the old one and index the new and the GC
      // will take care of cleaning up the gaps
    }

  
    private *chunkText(text: string): IterableIterator<DocumentChunk> {
        let startPos = 0;
        while (startPos < text.length) {
            const endPos: number = Math.min(startPos + this.chunkSize, text.length);
            const chunkText: string = text.substring(startPos, endPos);
            this.maxChunkId += 1;
            startPos += this.chunkSize - this.overlap;
            yield { id: this.maxChunkId, text: chunkText};
        }
    }

    public getChunkText(chunkId: number): Promise<string> {
      return new Promise((resolve, reject) => {
        // Iterate through the pointer array to find the document that contains the chunk
        // then do math on the document to find the chunk
        for (let i = 0; i < this.pointerStartOfDocId.length; i++) {
          if (this.pointerStartOfDocId[i] > chunkId) {
            const docId: number = i - 1;
            const currentDocument: Document = this.indexToDoc[docId];
            const start: number = this.pointerStartOfDocId[docId];
            const chunkIndex: number = chunkId - start;
    
            this.app.vault.read(currentDocument.file).then((fileContent) => {
              const chunks : Array<DocumentChunk> = Array.from(this.chunkText(fileContent));
              if (chunkIndex < chunks.length) {
                resolve(chunks[chunkIndex].text);
              } else {
                reject(new Error("Chunk index out of bounds"));
              }
            });
            return;
          }
        }
        reject(new Error("No document contains the specified chunkId"));
      });
    }

    public async similaritySearch(query: string, topK: number = 5): Promise<Array<SimilarityResult>> {
      const queryVector: tf.Tensor2D = await this.encodeStringToVector(query)
      const totalNumberOfDocuments: number = this.maxDocId - this.docIdsMarkedForDeletion.size;
      const nn : {label: string, classIndex: number, confidences: {[classId: number]: number}} = await this.knn.predictClass(queryVector, topK);
      const confidences : {[classId: number]: number} = nn.confidences;
      let results: Array<{filePath: string, similarity: number, documentText: string}> = [];
      Object.keys(confidences).forEach(async classId => {
        const id: number = parseInt(classId);
        console.log(`classId: ${classId}, confidence: ${confidences[id]}`);
        results.push({filePath: this.indexToDoc[id].file.path, similarity: confidences[id], documentText: await this.app.vault.read(this.indexToDoc[id].file)});
      });

      return results;

    }


}
