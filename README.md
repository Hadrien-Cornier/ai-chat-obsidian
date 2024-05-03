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
- [X] add number of documents indexed 
- [X] make the chat a drawer instead of a modal so that I can still read the document while we are loading
- [X] enable enter key in the chat modal
- [X] display loading bar when indexing in the status bar at the bottom.
- [X] display a loading bar in chatbox
- [X] make icon toggle when current file is indexed and hasn't been modified

# Upcoming features
- [ ] add tool that can query the internet for information
- [ ] ability to ask questions within a page
- [ ] filter documents based on tags before starting the RAG conversation
- [ ] add editor command to rewrite selection with the llm
- [ ] add editor command to autocomplete the current line with llms
- [ ] use Promise.all(...) to insert all documents with a command
- [ ] figure out a way to report progress to the user of the indexing time left
- [ ] add a command to index all documents in the vault
- [ ] make the chat side drawer look nicer
- [ ] persist/load the document store in a file

- [ ] add tool to scrap data in response to search