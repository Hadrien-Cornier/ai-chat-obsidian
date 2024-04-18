# ai-chat-obsidian
Talk to your obsidian notes

# Bugs currently

llamaindex has a bunch of old dependencies that are buggy because there are so many features.

So I suggest you go into ```node_modules/llamaindex/dist``` and comment out any file that is giving you error messages.

I added this command in .zshrc to make it faster :

```alias comment_out='sed -i ".bak" "s/^/\/\/ /"'```

and then 

```comment_out node_modules/llamaindex/dist/storage/vectorStore/MongoDBAtlasVectorStore.js```

also if ollama request is blocked because of CORS, you can do this : 

```export OLLAMA_ORIGINS="*"```
# Upcoming features
- filter documents based on tags before starting the RAG process
- add editor command to rewrite selection with the llm
- add editor command to autocomplete the current line with llms