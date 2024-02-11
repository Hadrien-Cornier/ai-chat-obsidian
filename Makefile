
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