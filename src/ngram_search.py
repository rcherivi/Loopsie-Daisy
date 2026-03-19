import json
import os
import re
from collections import Counter
import math

def preprocess(text):
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return text

def generate_ngrams(text, n = 3):
    text = preprocess(text)
    text = text.replace(" ", "")

    if len(text) < n:
        return []
    
    return [text[i:i+n] for i in range(len(text) - n + 1)]

def vectorize(text, n = 3):
    ngrams = generate_ngrams(preprocess(text), n)
    return Counter(ngrams)

def cosine_sim(v1, v2):
    intersection = set(v1.keys()) & set(v2.keys())
    dot_prod = sum(v1[x] * v2[x] for x in intersection)

    magv1 = math.sqrt(sum(v**2 for v in v1.values()))
    magv2 = math.sqrt(sum(v**2 for v in v2.values()))

    if magv1 == 0 or magv2 == 0:
        return 0
    
    return dot_prod / (magv1 * magv2)

def ngram_sim(query, doc, n = 3):
    q_vec = vectorize(query, n)
    d_vec = vectorize(doc, n)
    return cosine_sim(q_vec, d_vec)

def word_overlap_score(query, doc):
    q_words = set(preprocess(query).split())
    d_words = set(preprocess(doc).split())

    if not q_words:
        return 0

    return len(q_words & d_words) / len(q_words)