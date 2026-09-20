# Semantic Code Search

A specialized RAG system designed to ingest, index, and query entire software repositories. 

## Tech Stack
- **Python**
- **Embeddings & Vector DBs** 
- **LLM APIs** (Context window optimization)
- **RAG** (Semantic search over code)

## Overview
Standard text chunking breaks code logic. I built a custom parser to chunk functions and classes intelligently before embedding them. This allows the LLM to accurately answer deep architectural questions about complex codebases.
