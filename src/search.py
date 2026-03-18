# import json
# import math
# import re
# from nltk.stem.snowball import SnowballStemmer
# from nltk.corpus import stopwords
# import os
# # In app.py:
# # import nltk
# # nltk.download('stopwords')

# # PREPROCESS 

# # Initialize stemmer
# stemmer = SnowballStemmer("english")
# STOPWORDS = set(stopwords.words("english"))

# def preprocess(text):
#     """Lowercase, tokenize, remove stopwords, and stem."""
#     text = text.lower()
#     tokens = re.findall(r"[a-z]+", text)
#     tokens = [stemmer.stem(t) for t in tokens if t not in STOPWORDS]
#     return tokens

# # LOAD DATA 

# current_directory = os.path.dirname(os.path.abspath(__file__))

# # Load data once at startup
# # with open("init.json", "r") as f:
# with open(os.path.join(current_directory, "init.json"), "r") as f:
#     data = json.load(f)

# episodes = data["episodes"]
# reviews = {r["id"]: r["imdb_rating"] for r in data["reviews"]}

# for ep in episodes:
#     ep["toks"] = preprocess(ep["title"] + " " + ep["descr"])


# # INVERTED INDEX 
# def build_inverted_index(docs):
#     """Build inverted index mapping term -> [(doc_id, tf), ...]"""
#     inv_idx = defaultdict(list)
#     for doc_id, doc in enumerate(docs):
#         term_counts = Counter(doc["toks"])
#         for term, count in term_counts.items():
#             inv_idx[term].append((doc_id, count))
#     return inv_idx


# def build_tfidf_index(documents):
#     """Build a TF-IDF index from a list of (id, text) tuples."""
#     N = len(documents)
    
#     # Step 1: Compute term frequencies per document
#     tf = {}
#     for doc_id, text in documents:
#         tokens = preprocess(text)
#         tf[doc_id] = {}
#         for token in tokens:
#             tf[doc_id][token] = tf[doc_id].get(token, 0) + 1
#         # Normalize TF by document length
#         total = sum(tf[doc_id].values())
#         for token in tf[doc_id]:
#             tf[doc_id][token] /= total

#     # Step 2: Compute document frequency (how many docs each term appears in)
#     df = {}
#     for doc_id in tf:
#         for token in tf[doc_id]:
#             df[token] = df.get(token, 0) + 1

#     # Step 3: Compute IDF
#     idf = {token: math.log(N / df[token]) for token in df}

#     # Step 4: Compute TF-IDF vectors
#     tfidf = {}
#     for doc_id in tf:
#         tfidf[doc_id] = {
#             token: tf[doc_id][token] * idf[token]
#             for token in tf[doc_id]
#         }

#     return tfidf, idf


# def cosine_similarity(vec1, vec2):
#     """Compute cosine similarity between two TF-IDF vectors."""
#     # Dot product
#     dot = sum(vec1.get(t, 0) * vec2.get(t, 0) for t in vec2)
#     # Magnitudes
#     mag1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
#     mag2 = math.sqrt(sum(v ** 2 for v in vec2.values()))
#     if mag1 == 0 or mag2 == 0:
#         return 0.0
#     return dot / (mag1 * mag2)


# # CHANGE THIS FOR RELEVANT CROCHET FIELDS 
# documents = [(ep["id"], ep["title"] + " " + ep["descr"]) for ep in episodes]
# tfidf_index, idf = build_tfidf_index(documents)


# def json_search(query):
#     """Search episodes using TF-IDF + Snowball stemming."""
#     if not query or not query.strip():
#         query = "Kardashian"

#     # Preprocess query
#     query_tokens = preprocess(query)
#     if not query_tokens:
#         return []

#     # Build query TF-IDF vector
#     query_tf = {}
#     for token in query_tokens:
#         query_tf[token] = query_tf.get(token, 0) + 1
#     total = sum(query_tf.values())
#     query_tfidf = {
#         token: (query_tf[token] / total) * idf.get(token, 0)
#         for token in query_tf
#     }

#     # Score each document
#     scores = []
#     for ep in episodes:
#         doc_id = ep["id"]
#         score = cosine_similarity(tfidf_index[doc_id], query_tfidf)
#         if score > 0:
#             scores.append((score, ep))

#     # Sort by score descending
#     scores.sort(key=lambda x: x[0], reverse=True)

#     # OUTPUT -> CHANGE THIS TO CROCHET FORMAT 
#     matches = []
#     for score, ep in scores:
#         matches.append({
#             "title": ep["title"],
#             "descr": ep["descr"],
#             "imdb_rating": reviews.get(ep["id"], None),
#             "score": round(score, 4)
#         })

#     return matches

import os
import json
import math
import re
from collections import defaultdict, Counter
from nltk.stem.snowball import SnowballStemmer
from nltk.corpus import stopwords
import numpy as np

# Preprocessing (tokenization and Snowball) 

stemmer = SnowballStemmer("english")
STOPWORDS = set(stopwords.words("english"))


def preprocess(text):
    """Lowercase, tokenize (A1-style regex), remove stopwords, and stem."""
    text = text.lower()
    tokens = re.findall(r"[a-z]+", text)
    return [stemmer.stem(t) for t in tokens if t not in STOPWORDS]


# Load data

current_directory = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(current_directory, "init.json"), "r") as f:
    data = json.load(f)

episodes = data["episodes"]
reviews = {r["id"]: r["imdb_rating"] for r in data["reviews"]}

for ep in episodes:
    ep["toks"] = preprocess(ep["title"] + " " + ep["descr"])


#  Inverted Index 
def build_inverted_index(docs):
    """Build inverted index mapping term -> [(doc_id, tf), ...]"""
    inv_idx = defaultdict(list)
    for doc_id, doc in enumerate(docs):
        term_counts = Counter(doc["toks"])
        for term, count in term_counts.items():
            inv_idx[term].append((doc_id, count))
    return inv_idx


# Compute IDF 

def compute_idf(inv_idx, n_docs, min_df=2, max_df_ratio=0.95):
    """Compute IDF values, filtering too-rare and too-common terms."""
    idf = {}
    for term, postings in inv_idx.items():
        df = len(postings)
        if df < min_df:
            continue
        if df / n_docs > max_df_ratio:
            continue
        idf[term] = math.log2(n_docs / (1 + df))
    return idf



def compute_doc_norms(inv_idx, idf, n_docs):
    """Precompute euclidean norm of each document's TF-IDF vector."""
    norms = np.zeros(n_docs)
    for term, postings in inv_idx.items():
        if term not in idf:
            continue
        for doc_id, tf in postings:
            norms[doc_id] += (tf * idf[term]) ** 2
    return np.sqrt(norms)



def accumulate_dot_scores(query_word_counts, inv_idx, idf):
    """Term-at-a-time dot product accumulation."""
    doc_scores = defaultdict(float)
    for term, tf_query in query_word_counts.items():
        if term not in idf or term not in inv_idx:
            continue
        query_weight = tf_query * idf[term]
        for doc_id, tf_doc in inv_idx[term]:
            doc_scores[doc_id] += query_weight * (tf_doc * idf[term])
    return dict(doc_scores)


# Index Search 

def index_search(query, inv_idx, idf, doc_norms):
    """Search using cosine similarity via inverted index."""
    query_tokens = preprocess(query)
    query_word_counts = Counter(query_tokens)

    dot_scores = accumulate_dot_scores(query_word_counts, inv_idx, idf)

    # Compute query norm
    query_norm_sq = sum(
        (tf * idf[term]) ** 2
        for term, tf in query_word_counts.items()
        if term in idf
    )
    query_norm = math.sqrt(query_norm_sq)

    results = []
    for doc_id, numerator in dot_scores.items():
        if doc_norms[doc_id] == 0 or query_norm == 0:
            continue
        score = numerator / (query_norm * doc_norms[doc_id])
        results.append((score, doc_id))

    results.sort(reverse=True)
    return results


#  Build index 

N = len(episodes)
inv_idx = build_inverted_index(episodes)
idf = compute_idf(inv_idx, N, min_df=2, max_df_ratio=0.95)
inv_idx = {k: v for k, v in inv_idx.items() if k in idf}  # prune like A4
doc_norms = compute_doc_norms(inv_idx, idf, N)



def json_search(query):
    if not query or not query.strip():
        query = "Kardashian"

    results = index_search(query, inv_idx, idf, doc_norms)

    if not results:
        return []

    matches = []
    for score, doc_id in results:
        ep = episodes[doc_id]
        matches.append({
            "title": ep["title"],
            "descr": ep["descr"],
            "imdb_rating": reviews.get(ep["id"], None),
            "score": round(score, 4)
        })

    return matches