from langchain.text_splitter import CharacterTextSplitter
from obsidian_loader import ObsidianLoader
from langchain_community.embeddings.sentence_transformer import SentenceTransformerEmbeddings
from langchain_community.vectorstores import Chroma

# load the document and split it into chunks
loader = ObsidianLoader("/Users/hcornier/Documents/Obsidian/RAG_PLUGIN")
documents = loader.load()

# split it into chunks
text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
docs = text_splitter.split_documents(documents)

# create the open-source embedding function
embedding_function = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")

# load it into Chroma
db = Chroma.from_documents(docs, embedding_function)

# query it
query = "hello, how many documents are there?"
docs = db.similarity_search(query)

# print results
print(docs[0].page_content)

# Questions : 
# Is this persistent  ? 
# TODO : allow the user to trigger this from Obsidian
# Think about the inference process. How do we run this locally ?