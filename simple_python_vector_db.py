from chromadb.config import C
from flask import Flask, request, jsonify
import hashlib
import json
from sentence_transformers import SentenceTransformer
import os
import numpy as np

app = Flask(__name__)

# Initialize the sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

# In-memory storage
documents = []

def chunk_text(file_path, chunk_size=100, overlap=20):
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


@app.route('/process/<path:file_path>', methods=['POST'])
def process_file(file_path):
    if not os.path.exists(file_path):
        return jsonify({'error': 'File does not exist'}), 404
    
    with open(file_path, 'r', encoding='utf-8') as file:
        text = file.read()
    
    chunks = chunk_text(text)
    embeddings = [model.encode(chunk) for chunk in chunks]
    
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        doc_hash = hashlib.sha256(chunk.encode()).hexdigest()
        documents.append({
            'file_name': os.path.basename(file_path),
            'id': doc_hash,  # Hash of the content is the same as document_id in this simplified example
            'embedding': list(embedding)  # Convert numpy array to list for JSON serialization
        })
    
    return jsonify({'message': 'File processed successfully', 'chunk_count': len(embeddings)})

@app.route('/persist', methods=['GET'])
def persist_to_disk():
    with open('documents.json', 'w', encoding='utf-8') as f:
        json.dump(documents, f, ensure_ascii=False, indent=4)
    return jsonify({'message': 'Documents persisted to disk'})

@app.route('/load', methods=['GET'])
def load_from_disk():
    global documents
    if os.path.exists('documents.json'):
        with open('documents.json', 'r', encoding='utf-8') as f:
            documents = json.load(f)
    else:
        documents = []
    return jsonify({'message': 'Documents loaded from disk'})

@app.route('/search/<string:query>/<int:k>', methods=['POST'])
def similarity_search(query, k=5):
    query_embedding = model.encode(query)
    distances = []
    for doc in documents:
        # min heap can be used to optimize this
        distance = np.linalg.norm(np.array(doc['embedding']) - np.array(query_embedding))
        distances.append((doc, distance))
    distances.sort(key=lambda x: x[1])
    return [doc for doc, _ in distances[:k]]

if __name__ == '__main__':
    app.run(debug=True)
