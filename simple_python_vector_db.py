from pydoc import Doc
from chromadb.config import C
from flask import Flask, request, jsonify
import hashlib
import json
from sentence_transformers import SentenceTransformer
import os
import numpy as np
from typing import Iterator, Tuple
import logging


# TODO : debug the getchunk_text
class DocumentStore:
    def __init__(self, storage_path: str, chunk_size: int=1000, overlap: int=200):
        """
        Args:
            storage_path: the path to store the data
            chunk_size: the size of the chunks to split the documents into
            overlap: the overlap between the chunks
        """
        self.storage_path = storage_path
        self.embedded_chunks = np.array([],dtype=np.float32)
        self.chunk_hash_to_doc_id = {}
        self.chunk_id_to_doc_id = {}
        self.doc_id_to_file_path = {}
        self.pointer_start_of_doc_id = np.array([],dtype=np.int32)
    
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.log = logging.getLogger("DocumentStore")
        self.max_doc_id = -1
        self.max_chunk_id = -1

        # for now we cannot have different chunk sizes per doc
        self.chunk_size = chunk_size
        self.overlap = overlap

        self.load_from_disk()
    
    def load_from_disk(self) -> None:
        """
        Loads the store from disk if it exists
        """
        #storage path is the upper level directory
        if os.path.exists(self.storage_path):
            self.embedded_chunks = np.load(os.path.join(self.storage_path,"embedded_chunks.npy"))
            self.pointer_start_of_doc_id = np.load(os.path.join(self.storage_path,"pointer_start_of_doc_id.npy"))

            self.chunk_hash_to_doc_id = json.load(open(os.path.join(self.storage_path,"chunk_hash_to_doc_id.json")))
            self.doc_id_to_file_path = json.load(open(os.path.join(self.storage_path,"doc_id_to_file_path.json")))
            self.chunk_id_to_doc_id = json.load(open(os.path.join(self.storage_path,"chunk_id_to_doc_id.json")))

            metadata = json.load(open(os.path.join(self.storage_path,"metadata.json")))
            self.max_doc_id = metadata['max_doc_id']
            self.max_chunk_id = metadata['max_chunk_id']
            self.chunk_size = metadata['chunk_size']
            self.overlap = metadata['overlap']

            self.log.info("Loaded from disk")
        else:
            self.log.info("No data found in disk")
        return
    
    def persist_to_disk(self) -> None:
        """
        Writes the current state of the store to disk
        """
        if not os.path.exists(self.storage_path):
            os.makedirs(self.storage_path)
        np.save(os.path.join(self.storage_path,"embedded_chunks.npy"),self.embedded_chunks)
        json.dump(self.chunk_hash_to_doc_id,open(os.path.join(self.storage_path,"chunk_hash_to_doc_id.json"),"w"))
        json.dump(self.doc_id_to_file_path,open(os.path.join(self.storage_path,"doc_id_to_file_path.json"),"w"))
        json.dump(self.chunk_id_to_doc_id,open(os.path.join(self.storage_path,"chunk_id_to_doc_id.json"),"w"))
        json.dump({'max_doc_id': self.max_doc_id, 'max_chunk_id': self.max_chunk_id, 'chunk_size': self.chunk_size, 'overlap': self.overlap},open(os.path.join(self.storage_path,"metadata.json"),"w"))
        self.log.info("Persisted to disk")
    
    def add_document(self, file_path: str, chunk_size: int=100, overlap: int=20) -> int:
        """
        Adds a document to the store and returns the number of chunks added
        """
        chunks = self.chunk_text(file_path)
        doc_id = self.max_doc_id + 1
        self.doc_id_to_file_path[doc_id] = file_path
        self.pointer_start_of_doc_id = np.append(self.pointer_start_of_doc_id, self.max_chunk_id)

        i=0
        for hash,chunk  in chunks:
            vector = self.model.encode(chunk)
            if hash in self.chunk_hash_to_doc_id:
                self.log.info(f"Chunk {hash} already exists in the store, skipping...")
                continue
            else : 
                i+=1
                self.chunk_hash_to_doc_id[hash] = doc_id
                self.max_chunk_id += 1
                self.chunk_id_to_doc_id[self.max_chunk_id] = doc_id
                if len(self.embedded_chunks) == 0:
                    self.embedded_chunks = np.array(vector).reshape(-1,384)
                else : 
                    self.embedded_chunks = np.concatenate([self.embedded_chunks,np.array(vector).reshape(-1,384)],axis=0).reshape(-1,384)
        
        self.log.info(f"Added {i} chunks to the store")
        if i>0 : 
            self.max_doc_id += 1
        return i
    
    def chunk_text(self, file_path: str) -> Iterator[Tuple[str,str]]:
        """
        Returns an iterator over the chunks of the file
        """
        # suboptimal because it cuts through words
        with open(file_path, 'r', encoding='utf-8') as file:
            prev = file.read(self.overlap)
            while True:
                chunk = file.read(self.chunk_size-self.overlap)
                if not chunk:
                    break
                chunk = prev + chunk
                prev = chunk[-self.overlap:]
                yield hashlib.sha256(chunk.encode()).hexdigest(), chunk
    
    def get_chunk_text(self, chunk_id: int) -> str:
        """
        Returns the text of the chunk with the given chunk_id
        """
        doc_id = self.chunk_id_to_doc_id[chunk_id]
        file_path = self.doc_id_to_file_path[doc_id]
        # we know the overall chunk_id
        # we know at which chunk_id the doc starts
        # we know that the satrt of the i_th chunk of the doc is i*(chunk_size-overlap)
        # chunks are 0 indexed
        with open(file_path, 'r', encoding='utf-8') as file:
            chunk_number_in_the_doc = chunk_id - self.pointer_start_of_doc_id[doc_id]
            file.seek(chunk_number_in_the_doc*(self.chunk_size-self.overlap))
            return file.read(self.chunk_size)

    def similarity_search(self, query: str, k: int=5) -> list:
        """
        Returns the k most similar documents to the given query
        And the text of the chunks that are most similar to the query within the documents
        """
        query_embedding = self.model.encode(query)
        scores = np.dot(self.embedded_chunks, query_embedding)
        top_k = np.argpartition(2-2*scores, k)[:k] # returns the topk but not in order and it's faster than sorting
        results = []
        for i in top_k:
            doc_id = self.chunk_id_to_doc_id[i]
            file_path = self.doc_id_to_file_path[doc_id]
            results.append({'file_path': file_path, 'similarity': scores[i], 'relevant_chunk': self.get_chunk_text(i)})
        return results

global DocStore
DocStore = DocumentStore(os.path.join(os.curdir, 'docstore'))
app = Flask(__name__)

@app.route('/process', methods=['POST'])
def process_file():
    chunk_cnt = DocStore.add_document(request.json.get('file_path'))
    return jsonify({'message': 'File processed successfully', 'chunk_count': chunk_cnt})

@app.route('/persist', methods=['GET'])
def persist_to_disk():
    DocStore.persist_to_disk()
    return jsonify({'message': 'Documents persisted to disk'})

@app.route('/load', methods=['GET'])
def load_from_disk():
    DocStore.load_from_disk()
    return jsonify({'message': 'Documents loaded from disk'})

@app.route('/search', methods=['POST'])
def similarity_search():
    query = request.json.get('query')
    k = request.json.get('k')
    results = DocStore.similarity_search(query, k)
    return jsonify(results)

# if __name__ == '__main__':
#     app.run(debug=True)
