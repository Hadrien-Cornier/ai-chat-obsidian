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

# Completed features 
- [X] use an icon to open up the chatbot
- [ ] add number of documents indexed 

# Upcoming features
- [ ] make the chat look better
- [ ] add tool that can query the internet for information
- [ ] ability to ask questions within a page
- [ ] filter documents based on tags before starting the RAG conversation
- [ ] add editor command to rewrite selection with the llm
- [ ] add editor command to autocomplete the current line with llms
