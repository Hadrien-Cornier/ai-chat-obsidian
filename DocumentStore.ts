import AiChat from 'main';
import { Notice } from 'obsidian';
import { App, Plugin, TFile } from 'obsidian';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as tf from '@tensorflow/tfjs';

interface DocumentChunk {
    id: number;
    text: string;
  }
  
export class DocumentStore {
    private app: App;
    private storagePath: string;
    private embeddedChunks: tf.Tensor2D;
    private chunkIdToDocId: { [key: number]: number };
    private docIdToFilePath: { [key: number]: string };
    private pointerStartOfDocId: tf.Tensor1D;
    private model: any; // Placeholder for SentenceTransformer or equivalent
    private maxDocId: number = -1;
    private maxChunkId: number = -1;
    private chunkSize: number;
    private overlap: number;
    private plugin: AiChat;

    constructor(app: App, plugin: AiChat, storagePath: string, chunkSize: number = 1000, overlap: number = 200) {
      this.app = app;
      this.plugin = plugin;
      this.storagePath = storagePath;
      this.embeddedChunks = tf.tensor2d([], [0, 0]);
      this.chunkIdToDocId = {};
      this.docIdToFilePath = {};
      this.pointerStartOfDocId = tf.tensor1d([]);
      this.chunkSize = chunkSize;
      this.overlap = overlap;
    }
  
    onload() {
    }
  
    onunload() {
    }

    private async encodeStringToVector(text: string): Promise<tf.Tensor2D> {
      const model = await use.load();
      const embeddings = await model.embed([text]);
      return embeddings as unknown as tf.Tensor2D;
    }

    private async loadFromDisk(): Promise<void> {
      // TODO   
    }

    private async saveJsonToFile(filePath: string, data: any): Promise<void> {
        const fileContent = JSON.stringify(data, null, 2);
        await this.app.vault.adapter.write(filePath, fileContent);
      }
  
    public async persistToDisk(): Promise<void> {
        try {
          if (!this.app.vault.getAbstractFileByPath(this.storagePath)) {
            await this.app.vault.createFolder(this.storagePath);
          }
          await this.saveJsonToFile(`${this.storagePath}/embedded_chunks.json`, this.embeddedChunks);
          await this.saveJsonToFile(`${this.storagePath}/doc_id_to_file_path.json`, this.docIdToFilePath);
          await this.saveJsonToFile(`${this.storagePath}/chunk_id_to_doc_id.json`, this.chunkIdToDocId);
          const metadata = {
            maxDocId: this.maxDocId,
            maxChunkId: this.maxChunkId,
            chunkSize: this.chunkSize,
            overlap: this.overlap,
          };
          await this.saveJsonToFile(`${this.storagePath}/metadata.json`, metadata);
          new Notice('Data successfully persisted to disk.');
        } catch (error) {
          console.error('Failed to persist data:', error);
          new Notice('Error persisting data to disk.');
        }
      }
  

      public async addDocument(file: TFile): Promise<number> {
        const fileContent = await this.app.vault.read(file);
        const chunks = this.chunkText(fileContent);
        let chunkIndex = 0;
        let firstChunk = true;
    
        for await (const {id, text} of chunks) {
            this.maxChunkId += 1;
            if (firstChunk) {
                this.maxDocId += 1;
                this.docIdToFilePath[this.maxDocId] = file.path;
                this.pointerStartOfDocId = tf.concat([this.pointerStartOfDocId, tf.tensor([id])]);
                firstChunk = false;
            }
    
            const vector = await this.encodeStringToVector(text);
    
            if (this.embeddedChunks === undefined || this.embeddedChunks.shape[0] === 0) {
                this.embeddedChunks = vector.clone();
            } else {
                this.embeddedChunks = tf.concat([this.embeddedChunks, vector], 0);
            }
    
            this.chunkIdToDocId[this.maxChunkId] = this.maxDocId;
    
            chunkIndex++;
        }
    
        console.log(`Added ${chunkIndex} chunks from document: ${file.name}`);
        return chunkIndex;
    }
  
    private *chunkText(text: string): IterableIterator<DocumentChunk> {
        let startPos = 0;
        while (startPos < text.length) {
            const endPos = Math.min(startPos + this.chunkSize, text.length);
            const chunkText = text.substring(startPos, endPos);
            this.maxChunkId += 1;
            startPos += this.chunkSize - this.overlap;
            yield { id: this.maxChunkId, text: chunkText};
        }
    }

    public async getChunkText(chunkId: number): Promise<string> {
      const docId = this.chunkIdToDocId[chunkId];
      const filePath = this.docIdToFilePath[docId];
      const file = this.app.vault.getAbstractFileByPath(filePath);
  
      if (file instanceof TFile) {
          const fileContent = await this.app.vault.read(file);
          const pointerStartOfDocIdData = await this.pointerStartOfDocId.data();
          const chunkStartIndexForDoc = pointerStartOfDocIdData[docId];
  
          if (chunkStartIndexForDoc === undefined) {
              throw new Error("Document start index not found.");
          }
  
          // Calculate the start position of the chunk in the document
          const chunkNumberInDoc = chunkId - chunkStartIndexForDoc;
          const start = chunkNumberInDoc * (this.chunkSize - this.overlap);
          const end = start + this.chunkSize;
  
          const chunkText = fileContent.slice(start, Math.min(end, fileContent.length));
          return chunkText;
      } else {
          throw new Error("File not found or the path does not point to a file.");
      }
  }
    public async similaritySearch(query: string, k: number = 5): Promise<Array<{filePath: string, similarity: number, relevantChunk: string}>> {
      const queryVector = await this.encodeStringToVector(query);
      const queryVectorNormalized = queryVector.div(tf.norm(queryVector));
  
      const normalizedEmbeddedChunks = this.embeddedChunks;
      const scores = normalizedEmbeddedChunks.dot(queryVectorNormalized.reshape([-1, 1]));
      const scoresArray = await scores.data();
  
      const topKIndices = tf.topk(scores.reshape([-1]), k).indices;
      const topKIndicesArray = await topKIndices.data();
  
      const results = [];
      for (let i = 0; i < topKIndicesArray.length; i++) {
          const index = topKIndicesArray[i];
          const docId = this.chunkIdToDocId[index];
          const filePath = this.docIdToFilePath[docId];
          const similarity = scoresArray[index];
          const relevantChunk = await this.getChunkText(index);
          results.push({filePath, similarity, relevantChunk});
      }
  
      return results;
  }
  }
