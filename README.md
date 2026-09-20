# Semantic Code Search

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

![Terminal Demo](demo.gif)

> **A specialized RAG system designed to ingest, index, and semantically query entire software repositories across multiple languages.**

## 🌟 Key Features
- ✅ **AST-aware code chunking strategy**
- ✅ **Language-agnostic embedding pipeline**
- ✅ **Precise cross-file dependency mapping**

## 🏗️ Architecture

```mermaid
flowchart TD
    A[Git Repository] -->|AST Parser| B(Function Chunker)
    B --> C[Embedding Model]
    C --> D[(Vector Index)]
    E[Dev Query] --> F[Semantic Search]
    F --> D
    F --> G[Code Intelligence Response]
```

## 🚀 Live API Endpoint (Vercel)

This project is deployed serverless via Vercel Edge Functions. You can test the interaction directly from your terminal.

```bash
# Example Request
curl -X GET https://semantic-code-search-apqiwu1ow-dev4aibots.vercel.app/api/health
```

## 💻 Developer Quickstart

### Prerequisites
- Python 3.11+
- Node.js (for Vercel CLI)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dev4aibots/semantic-code-search.git
   cd semantic-code-search
   ```

2. **Set up virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Add your API keys to .env
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

## 📁 Project Structure
```
.
├── api/                  # Vercel serverless endpoints
├── src/                  # Core Python modules & agent logic
├── tests/                # Unit and integration tests
├── public/               # Static assets
├── requirements.txt      # Python dependencies
└── vercel.json           # Vercel routing configuration
```

## 📄 License
This project is licensed under the MIT License.
