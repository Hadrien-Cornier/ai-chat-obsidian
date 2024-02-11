from pydoc import Doc
from chromadb.config import C
from flask import Flask, request, jsonify
import hashlib
import json
from sentence_transformers import SentenceTransformer
import os
import numpy as np
from typing import Iterator

class DocumentStore:
    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        self.documents = []
        self.load_from_disk()
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def load_from_disk(self):
        if os.path.exists(self.storage_path):
            with open(self.storage_path, 'r', encoding='utf-8') as f:
                self.documents = json.load(f)
        else:
            self.documents = []
    
    def persist_to_disk(self):
        with open(self.storage_path, 'w', encoding='utf-8') as f:
            json.dump(self.documents, f, ensure_ascii=False, indent=4)
    
    def add_document(self, file_path: str, chunk_size: int=100, overlap: int=20)-> int:
        chunks = self.chunk_text(file_path, chunk_size, overlap)
        embeddings = [self.model.encode(chunk) for chunk in chunks]
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            doc_hash = hashlib.sha256(chunk.encode()).hexdigest()
            self.documents = self.documents + [{
                'file_name': os.path.basename(file_path),
                'id': doc_hash,  # Hash of the content is the same as document_id in this simplified example
                'embedding': list(embedding)  # Convert numpy array to list for JSON serialization
            }]
        return len(embeddings)
    
    def chunk_text(self, file_path: str, chunk_size: int=100, overlap: int=20) -> Iterator[str]:
        # suboptimal because it cuts through words
        with open(file_path, 'r', encoding='utf-8') as file:
            prev = file.read(overlap)
            while True:
                chunk = file.read(chunk_size-overlap)
                if not chunk:
                    break
                chunk = prev + chunk
                prev = chunk[-overlap:]
                yield chunk
    
    def similarity_search(self, query: str, k: int=5):
        query_embedding = self.model.encode(query)
        distances = []
        for doc in self.documents:
            # min heap can be used to optimize this
            distance = np.linalg.norm(np.array(doc['embedding']) - np.array(query_embedding))
            distances.append((doc, distance))
        distances.sort(key=lambda x: x[1])
        return [doc for doc, _ in distances[:k]]

    def get_documents(self):
        return self.documents

global DocStore
DocStore = DocumentStore('documents.json')
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

@app.route('/get_documents', methods=['GET'])
def get_documents():
    return jsonify(DocStore.get_documents())

# if __name__ == '__main__':
#     app.run(debug=True)
