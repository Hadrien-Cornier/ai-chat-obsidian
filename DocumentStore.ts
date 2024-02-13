import AiChat from 'main';
import { Notice } from 'obsidian';
import { App, Plugin, TFile } from 'obsidian';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as tf from '@tensorflow/tfjs';

interface DocumentChunk {
    hash: string;
    chunk: string;
  }
  
export class DocumentStore {
    private app: App;
    private storagePath: string;
    private embeddedChunks: Float32Array[];
    private chunkIdToDocId: { [key: number]: number };
    private docIdToFilePath: { [key: number]: string };
    private pointerStartOfDocId: Int32Array;
    private model: any; // Placeholder for SentenceTransformer or equivalent
    private maxDocId: number = -1;
    private maxChunkId: number = -1;
    private chunkSize: number;
    private overlap: number;
  
    constructor(app: App, storagePath: string, chunkSize: number = 1000, overlap: number = 200) {
      super(app);
      this.app = app;
      this.storagePath = storagePath;
      this.embeddedChunks = [];
      this.chunkIdToDocId = {};
      this.docIdToFilePath = {};
      this.pointerStartOfDocId = new Int32Array([]);
      this.chunkSize = chunkSize;
      this.overlap = overlap;
      // You would need to initialize your model here, possibly offloading to a backend
    }
  
    onload() {
      // Load from disk or initialize
    }
  
    onunload() {
      // Cleanup or persist to disk
    }

    private async encodeStringToVector(text: string): Promise<tf.Tensor> {
    // Load the Universal Sentence Encoder model
    const model = await use.load();
    
    // Encode the string
    const embeddings = await model.embed([text]);
    
    // The embeddings here is a 2D tensor where each row is the 512-dimensional vector corresponding to the input text
    // For a single string, we can return the first row
    return embeddings;//.slice([0, 0], [1, embeddings.shape[1]]);
    }

    private async loadFromDisk(): Promise<void> {
      // Implement loading logic using fs or Obsidian's API
    }

    private async saveJsonToFile(filePath: string, data: any): Promise<void> {
        const fileContent = JSON.stringify(data, null, 2); // Pretty print the JSON
        await this.app.vault.adapter.write(filePath, fileContent);
      }
  
    public async persistToDisk(): Promise<void> {
        try {
          // Ensure the storage path exists
          if (!this.app.vault.getAbstractFileByPath(this.storagePath)) {
            await this.app.vault.createFolder(this.storagePath);
          }
    
          // Save embedded chunks to a file (example)
          await this.saveJsonToFile(`${this.storagePath}/embedded_chunks.json`, this.embeddedChunks);
    
          // Save doc ID to file path mapping
          await this.saveJsonToFile(`${this.storagePath}/doc_id_to_file_path.json`, this.docIdToFilePath);
    
          // Save chunk ID to doc ID mapping
          await this.saveJsonToFile(`${this.storagePath}/chunk_id_to_doc_id.json`, this.chunkIdToDocId);
    
          // Save metadata
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
      // Implement adding a document
      // This would involve reading the file, chunking it, and possibly sending chunks to a backend for embedding
      return 0; // Placeholder return
    }
  
    private chunkText(file: TFile): AsyncIterableIterator<DocumentChunk> {
      // Generator function to chunk the text of a file
      return null; // Placeholder return
    }
  
    public async similaritySearch(query: string, k: number = 5): Promise<any[]> {
      // Implement a similarity search over the embedded chunks
      // Likely involves calling a backend service that can perform the heavy lifting
      return []; // Placeholder return
    }
  }
