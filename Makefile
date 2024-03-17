
ENDPOINT=http://127.0.0.1:5000
FILE_PATH=/Users/hcornier/Documents/Obsidian/RAG_PLUGIN/rag_plugin/.obsidian/plugins/ai-chat-obsidian/simple_python_vector_db.py
process :
	curl -X POST -H "Content-type: application/json" \
	 -d "{\"file_path\" : \"$(FILE_PATH)\" }" \
	  $(ENDPOINT)/process

get_documents:
	curl -X GET $(ENDPOINT)/get_documents

persist:
	curl -X GET $(ENDPOINT)/persist

set-inference:
	pip install -r requirements.txt
	tensorflowjs_converter --input_format=tf_hub 'https://tfhub.dev/google/universal-sentence-encoder/4' /path/to/tfjs_model