# RAG Document Storage Architecture

**Status**: RFC (Request for Comments)
**Author**: @jnxmas
**Date**: 2026-02-09
**Related**: [ARCHITECTURE.md](../app/README.md#architecture)

---

## Executive Summary

This document outlines the architectural decision for storing and managing documents used in the OCapistaine RAG (Retrieval Augmented Generation) system. The solution must support:

- **Multiple municipalities** (starting with Audierne, scaling to others)
- **Data sovereignty** (GDPR/RGPD compliance, EU data residency)
- **RAG pipeline integration** (chunking, embeddings, vector search)
- **Separation of code and data** (no large binaries in git)

**Recommendation**: MongoDB GridFS with EU-hosted infrastructure, integrated with Mistral embeddings.

---

## Problem Statement

### Current State

```
sources/                    # ~16MB now, could grow to GB+
├── CCCSPR/                 # PDFs committed to git
├── economie/               # Large binaries bloat repo
├── previous_campagne/      # Historical context (2020 campaign)
├── ext_data/gwaien/        # ~40 municipal bulletins (2008-2025)
└── intergenerationel/      # Program documents
```

### Issues

| Problem                                  | Impact                              |
| ---------------------------------------- | ----------------------------------- |
| Git not designed for large binaries      | Slow clone, bloated history         |
| Hard to scale to multiple municipalities | No namespace/partition strategy     |
| No versioning for document updates       | Can't track deliberation amendments |
| Mixed concerns: code + data              | Deployment complexity               |
| No sovereignty controls                  | Data location unknown               |

---

## Key Considerations

### Data Sovereignty (RGPD/GDPR)

For civic data (municipal PDFs, citizen contributions):

- **Location**: Data must stay in France/EU
- **Providers**: Prefer OVH, Scaleway, or self-hosted over US-centric clouds
- **Encryption**: At rest and in transit (X.509 certs)
- **Audit**: Access logs, data residency tracking
- **Consent**: Anonymity handling for citizen data

### RAG Integration

Documents need to be:

1. **Chunked**: Split into semantic segments
2. **Embedded**: Vector representations (Mistral embeddings recommended - French company, EU-aligned)
3. **Indexed**: In a vector store for similarity search
4. **Queryable**: Filter by municipality, category, date

### Scalability Requirements

- Handle GB+ of documents per municipality
- Municipality-specific partitioning (namespacing)
- Version tracking for updated documents
- Support for multiple document types (PDF, images, audio transcripts)

---

## Scenarios Evaluated

### Scenario 1: Git LFS + Manifest

```
sources/
├── manifest.yaml           # Tracked - describes all sources
├── .gitkeep
└── [files fetched on demand via LFS]
```

| Aspect      | Assessment                                               |
| ----------- | -------------------------------------------------------- |
| Sovereignty | Low (GitHub US-based, LFS storage limits)                |
| RAG Fit     | Poor (binary tracking bloats clones, no native querying) |
| Scalability | Limited by LFS quotas                                    |
| Verdict     | **Not recommended**                                      |

### Scenario 2: External Object Storage + Sync

```
sources/
├── manifest.yaml           # Source registry (git tracked)
├── sync.py                 # Fetches from S3/MinIO
└── .gitignore              # Ignores all fetched files
```

**Storage Options:**

| Provider        | Cost        | Self-hosted | EU Residency | Notes                      |
| --------------- | ----------- | ----------- | ------------ | -------------------------- |
| AWS S3          | ~$0.02/GB   | No          | EU regions   | Standard, requires IAM     |
| MinIO           | Free        | Yes         | Full control | S3-compatible, recommended |
| Cloudflare R2   | Free egress | No          | EU possible  | Good for serving           |
| Scaleway Object | ~$0.01/GB   | No          | France       | Native EU                  |

| Aspect      | Assessment                                  |
| ----------- | ------------------------------------------- |
| Sovereignty | Strong with MinIO/Scaleway                  |
| RAG Fit     | Good (store blobs, metadata in separate DB) |
| Scalability | Excellent                                   |
| Verdict     | **Good option for pure file storage**       |

### Scenario 3: Multi-Repo with Submodules

```
ocapistaine/                      # Main code repo
├── sources/                      # Git submodule

locki-io/ocapistaine-sources/     # Separate data repo
├── audierne/
├── [future-municipality]/
└── manifest.yaml
```

| Aspect      | Assessment                          |
| ----------- | ----------------------------------- |
| Sovereignty | Tied to GitHub                      |
| RAG Fit     | Clunky (frequent pulls for updates) |
| Scalability | Limited by git                      |
| Verdict     | **Avoid for large-scale**           |

### Scenario 4: MongoDB GridFS (Recommended)

```
sources/                    # Local working directory (gitignored)
├── manifest.yaml           # Document registry
└── download.py             # Fetches from MongoDB GridFS
```

| Aspect      | Assessment                            |
| ----------- | ------------------------------------- |
| Sovereignty | Excellent (self-host or EU Atlas)     |
| RAG Fit     | Native vector search, unified storage |
| Scalability | Sharding, municipality partitioning   |
| Verdict     | **Recommended**                       |

### Scenario 5: DVC (Data Version Control)

```
sources/
├── audierne.dvc            # Pointer file (git tracked)
├── .dvc/                   # DVC config
└── audierne/               # Actual files (gitignored)
```

| Aspect      | Assessment                                   |
| ----------- | -------------------------------------------- |
| Sovereignty | Depends on backend                           |
| RAG Fit     | Sync to local, then process                  |
| Scalability | Good with S3/MinIO backend                   |
| Verdict     | **Solid alternative for git-style data ops** |

---

## Recommendation: Enhanced MongoDB GridFS

### Why MongoDB GridFS?

1. **Already in stack**: MongoDB selected for RAG content storage
2. **Unified system**: Metadata + binaries + vectors in one place
3. **Sovereignty**: Self-host Community Edition or use EU-region Atlas
4. **RAG-native**: `$vectorSearch` for similarity queries
5. **No vendor lock-in**: Exportable anytime, standard formats

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB (EU-hosted)                       │
├─────────────────────────────────────────────────────────────┤
│  ocapistaine_sources database                               │
│  ├── municipalities        # {code, name, config}           │
│  ├── documents             # Metadata + vectors             │
│  │   ├── municipality_id   # Partition key                  │
│  │   ├── category          # gwaien, deliberations, etc.    │
│  │   ├── filename          # Original name                  │
│  │   ├── gridfs_id         # Link to binary                 │
│  │   ├── vector_embedding  # Mistral-generated              │
│  │   └── sovereignty       # {location, encrypted, consent} │
│  └── fs.files / fs.chunks  # GridFS binary storage          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RAG Pipeline                              │
│  ├── Mistral Embeddings (EU API or local Ollama)            │
│  ├── LangChain MongoDBAtlasVectorSearch                     │
│  └── Query with municipality filter                         │
└─────────────────────────────────────────────────────────────┘
```

### Document Schema

```json
{
  "_id": "ObjectId()",
  "municipality": "audierne",
  "category": "gwaien",
  "filename": "Gwaien_n17_2025.pdf",
  "origin": "manual_scan",
  "uploaded_at": "ISODate('2026-01-28T00:00:00Z')",
  "version": 1,
  "tags": ["bulletin", "2025", "municipal"],
  "sovereignty": {
    "location": "EU-FR",
    "encrypted": true,
    "consent_required": false,
    "retention_policy": "permanent"
  },
  "content": {
    "text_extracted": true,
    "ocr_required": false,
    "language": "fr",
    "page_count": 12
  },
  "gridfs_id": "ObjectId()",
  "vector_embedding": [0.1, 0.2, "...768 dimensions..."]
}
```

---

## Implementation Plan

### Phase 1: Immediate (Hackathon)

**Goal**: Stop committing binaries, establish manifest pattern.

#### 1.1 Update `.gitignore`

```gitignore
# RAG source documents (fetched from MongoDB, not committed)
sources/**/*.pdf
sources/**/*.jpg
sources/**/*.jpeg
sources/**/*.png
sources/**/pdfs/

# Keep manifests and READMEs
!sources/**/manifest.yaml
!sources/**/README.md
!sources/**/*.md
```

#### 1.2 Create Manifest Template

`sources/manifest.yaml`:

```yaml
# OCapistaine RAG Document Registry
# This file tracks all document sources for the RAG system
# Actual files are stored in MongoDB GridFS, not git

version: "1.0"
last_updated: "2026-01-28"

municipalities:
  audierne:
    code: "29003"
    name: "Audierne"
    sources:
      - name: gwaien_bulletins
        type: pdf_collection
        description: "Municipal bulletin (2008-2025)"
        origin: local_scan
        local_path: ext_data/gwaien/
        count: 40
        uploaded: false
        sovereignty:
          location: EU-FR
          classification: public

      - name: deliberations
        type: pdf_collection
        description: "Council deliberations"
        origin: firecrawl
        source_url: https://audierne.bzh/deliberations-conseil-municipal/
        count: ~4000
        uploaded: false

      - name: arretes
        type: pdf_collection
        description: "Municipal decrees"
        origin: firecrawl
        source_url: https://audierne.bzh/publications-arretes/
        count: ~4010
        uploaded: false

      - name: previous_campaign
        type: mixed
        description: "2020 campaign materials"
        origin: facebook_archive
        count: 13
        uploaded: false
        sovereignty:
          classification: historical

      - name: cccspr_statutes
        type: pdf
        description: "CCCSPR modification statutes"
        origin: official
        filename: "2024-10-29-AP-modification-statuts-CCCSPR.pdf"
        uploaded: false

# Future municipalities template
# [municipality_code]:
#   code: "XXXXX"
#   name: "Municipality Name"
#   sources: [...]
```

#### 1.3 Local Development Workflow

```bash
# Developers clone repo (no large files)
git clone git@github.com:locki-io/ocapistaine.git

# Fetch documents from MongoDB (Phase 2+)
python sources/download.py --municipality audierne

# Or for hackathon: manual file sharing via secure transfer
```

### Phase 2: MongoDB Integration (Post-Hackathon)

#### 2.1 Infrastructure Setup

**Option A: Self-hosted (Recommended for sovereignty)**

```bash
# On OVH/Scaleway VPS (France)
docker run -d --name mongodb \
  -p 27017:27017 \
  -v /data/mongodb:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=<secure> \
  mongo:7.0 --auth
```

**Option B: MongoDB Atlas (EU Region)**

- Create cluster in `EU_WEST_1` (Ireland) or `EU_WEST_3` (Paris)
- Enable encryption at rest
- Configure IP allowlist

#### 2.2 Ingestion Script

`sources/upload.py`:

```python
#!/usr/bin/env python3
"""Upload documents to MongoDB GridFS with metadata and embeddings."""

import os
from pathlib import Path
from datetime import datetime
from pymongo import MongoClient
from gridfs import GridFS
import fitz  # PyMuPDF for PDF text extraction
from sentence_transformers import SentenceTransformer
import yaml

# Configuration
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DB_NAME = "ocapistaine_sources"
EMBEDDING_MODEL = "intfloat/multilingual-e5-base"  # Or Mistral via API

# Initialize
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
fs = GridFS(db)
model = SentenceTransformer(EMBEDDING_MODEL)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using PyMuPDF."""
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def upload_document(
    municipality: str,
    category: str,
    file_path: str,
    metadata: dict = None
) -> str:
    """Upload a document to GridFS with metadata and embedding."""

    file_path = Path(file_path)
    filename = file_path.name

    # Check if already uploaded
    existing = db.documents.find_one({
        "municipality": municipality,
        "filename": filename
    })
    if existing:
        print(f"Skipping {filename} - already uploaded")
        return str(existing["_id"])

    # Upload binary to GridFS
    with open(file_path, "rb") as f:
        gridfs_id = fs.put(f, filename=filename)

    # Extract text and generate embedding
    text = ""
    embedding = []
    if file_path.suffix.lower() == ".pdf":
        text = extract_text_from_pdf(str(file_path))
        if text.strip():
            # Truncate for embedding (model limit)
            embedding = model.encode(text[:8000]).tolist()

    # Build document record
    doc = {
        "municipality": municipality,
        "category": category,
        "filename": filename,
        "origin": metadata.get("origin", "unknown") if metadata else "unknown",
        "uploaded_at": datetime.utcnow(),
        "version": 1,
        "tags": metadata.get("tags", []) if metadata else [],
        "sovereignty": {
            "location": "EU-FR",
            "encrypted": True,
            "consent_required": False
        },
        "content": {
            "text_extracted": bool(text),
            "text_length": len(text),
            "page_count": metadata.get("page_count") if metadata else None
        },
        "gridfs_id": gridfs_id,
        "vector_embedding": embedding
    }

    result = db.documents.insert_one(doc)
    print(f"Uploaded {filename} -> {result.inserted_id}")
    return str(result.inserted_id)


def upload_from_manifest(manifest_path: str = "sources/manifest.yaml"):
    """Upload all documents defined in manifest."""

    with open(manifest_path) as f:
        manifest = yaml.safe_load(f)

    for muni_code, muni_data in manifest.get("municipalities", {}).items():
        print(f"\n=== Processing {muni_data['name']} ===")

        for source in muni_data.get("sources", []):
            if source.get("uploaded"):
                continue

            local_path = source.get("local_path")
            if not local_path:
                continue

            full_path = Path("sources") / local_path
            if not full_path.exists():
                print(f"Path not found: {full_path}")
                continue

            # Upload all files in directory
            if full_path.is_dir():
                for file in full_path.glob("**/*"):
                    if file.is_file() and file.suffix.lower() in [".pdf", ".jpg", ".jpeg", ".png"]:
                        upload_document(
                            municipality=muni_code,
                            category=source["name"],
                            file_path=str(file),
                            metadata={"origin": source.get("origin")}
                        )
            else:
                upload_document(
                    municipality=muni_code,
                    category=source["name"],
                    file_path=str(full_path),
                    metadata={"origin": source.get("origin")}
                )


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="sources/manifest.yaml")
    parser.add_argument("--file", help="Upload single file")
    parser.add_argument("--municipality", default="audierne")
    parser.add_argument("--category", default="misc")
    args = parser.parse_args()

    if args.file:
        upload_document(args.municipality, args.category, args.file)
    else:
        upload_from_manifest(args.manifest)
```

#### 2.3 Download Script

`sources/download.py`:

```python
#!/usr/bin/env python3
"""Download documents from MongoDB GridFS to local cache."""

import os
from pathlib import Path
from pymongo import MongoClient
from gridfs import GridFS

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DB_NAME = "ocapistaine_sources"
CACHE_DIR = Path("sources/.cache")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
fs = GridFS(db)


def download_documents(
    municipality: str = None,
    category: str = None,
    since: str = None
):
    """Download documents matching filters to local cache."""

    query = {}
    if municipality:
        query["municipality"] = municipality
    if category:
        query["category"] = category
    if since:
        from datetime import datetime
        query["uploaded_at"] = {"$gte": datetime.fromisoformat(since)}

    docs = db.documents.find(query)

    for doc in docs:
        # Create directory structure
        out_dir = CACHE_DIR / doc["municipality"] / doc["category"]
        out_dir.mkdir(parents=True, exist_ok=True)

        out_path = out_dir / doc["filename"]
        if out_path.exists():
            print(f"Cached: {out_path}")
            continue

        # Fetch from GridFS
        grid_out = fs.get(doc["gridfs_id"])
        with open(out_path, "wb") as f:
            f.write(grid_out.read())

        print(f"Downloaded: {out_path}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipality", "-m")
    parser.add_argument("--category", "-c")
    parser.add_argument("--since", help="ISO date filter")
    args = parser.parse_args()

    download_documents(args.municipality, args.category, args.since)
```

#### 2.4 RAG Query Integration

```python
# In your RAG pipeline (e.g., app/rag/retriever.py)

from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_community.embeddings import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="intfloat/multilingual-e5-base")

vector_store = MongoDBAtlasVectorSearch.from_connection_string(
    connection_string=MONGO_URI,
    namespace="ocapistaine_sources.documents",
    embedding=embeddings,
    index_name="vector_index",
    text_key="content.text"  # Or store chunked text separately
)

# Query with municipality filter
results = vector_store.similarity_search(
    query="propositions budget port",
    k=5,
    pre_filter={"municipality": "audierne", "category": "deliberations"}
)
```

### Phase 3: Multi-Municipality & Governance

#### 3.1 Municipality Onboarding

```yaml
# Add to manifest.yaml
municipalities:
  audierne:
    # ... existing ...

  douarnenez:
    code: "29046"
    name: "Douarnenez"
    sources:
      - name: deliberations
        type: pdf_collection
        source_url: https://douarnenez.bzh/...
        # ...
```

#### 3.2 Sharding Strategy

```javascript
// MongoDB sharding by municipality
sh.enableSharding("ocapistaine_sources");
sh.shardCollection("ocapistaine_sources.documents", { municipality: 1 });
```

#### 3.3 RGPD Compliance Checklist

- [ ] Data residency documented per municipality
- [ ] Encryption at rest enabled
- [ ] Access audit logs configured
- [ ] Retention policies defined
- [ ] Consent tracking for citizen-submitted content
- [ ] Data export capability (Article 20)
- [ ] Right to erasure workflow (Article 17)

---

## Cost Analysis

### Self-Hosted (Recommended)

| Component       | Provider      | Monthly Cost      |
| --------------- | ------------- | ----------------- |
| VPS (4GB RAM)   | OVH/Scaleway  | ~10 EUR           |
| Storage (100GB) | Included      | -                 |
| Backup          | S3-compatible | ~2 EUR            |
| **Total**       |               | **~12 EUR/month** |

### MongoDB Atlas (Managed)

| Tier             | Storage | Monthly Cost |
| ---------------- | ------- | ------------ |
| M10 (Shared)     | 10GB    | ~50 EUR      |
| M20 (Dedicated)  | 40GB    | ~120 EUR     |
| M30 (Production) | 100GB   | ~300 EUR     |

**Recommendation**: Start self-hosted for hackathon/MVP, consider Atlas for production if ops overhead becomes a concern.

---

## Trade-offs Summary

| Approach       | Sovereignty | RAG Fit   | Ops Effort | Cost       |
| -------------- | ----------- | --------- | ---------- | ---------- |
| Git LFS        | Low         | Poor      | Low        | Free       |
| MinIO + DB     | High        | Good      | Medium     | Low        |
| MongoDB GridFS | High        | Excellent | Medium     | Low-Medium |
| DVC            | Medium      | Good      | Medium     | Low        |
| Atlas Managed  | Medium      | Excellent | Low        | High       |

**Winner**: Self-hosted MongoDB GridFS balances sovereignty, RAG integration, and cost.

---

## References

- [MongoDB GridFS Documentation](https://www.mongodb.com/docs/manual/core/gridfs/)
- [LangChain MongoDB Integration](https://python.langchain.com/docs/integrations/vectorstores/mongodb_atlas)
- [Mistral AI Platform](https://mistral.ai/) - EU-based LLM provider
- [RGPD/GDPR Guidelines](https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on)
- [OVH Cloud (France)](https://www.ovhcloud.com/fr/)
- [Scaleway (France)](https://www.scaleway.com/)

---

## Changelog

| Date       | Change      | Author  |
| ---------- | ----------- | ------- |
| 2026-01-28 | Initial RFC | @jnxmas |
