import os
import hashlib
import numpy as np
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize
from ngram_search import ngram_sim
from tfidf_search import word_overlap
from fuzzy_utils import (
    build_fuzzy_vocab,
    normalize_query,
    fuzzy_title_score,
    _tokenize,
    stem_word,
)

vectorizer = None
svd = None
lsa_matrix = None
pattern_data = []

N_COMPONENTS = 600

_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".svd_cache")

def _cache_fingerprint(docs: list[str]) -> str:
    h = hashlib.sha1()
    h.update(str(N_COMPONENTS).encode())
    for d in docs:
        h.update(d.encode("utf-8", errors="replace"))
    return h.hexdigest()[:16]


def _cache_paths(fingerprint: str) -> dict:
    return {
        "vectorizer": os.path.join(_CACHE_DIR, f"{fingerprint}_vectorizer.joblib"),
        "svd":        os.path.join(_CACHE_DIR, f"{fingerprint}_svd.joblib"),
        "lsa_matrix": os.path.join(_CACHE_DIR, f"{fingerprint}_lsa.npy"),
    }


def _load_cache(fingerprint: str):
    paths = _cache_paths(fingerprint)
    if all(os.path.exists(p) for p in paths.values()):
        print("SVD cache hit — loading from disk...")
        vec = joblib.load(paths["vectorizer"])
        sv  = joblib.load(paths["svd"])
        lsa = np.load(paths["lsa_matrix"])
        return vec, sv, lsa
    return None, None, None


def _save_cache(fingerprint: str, vec, sv, lsa: np.ndarray):
    os.makedirs(_CACHE_DIR, exist_ok=True)
    paths = _cache_paths(fingerprint)
    joblib.dump(vec, paths["vectorizer"], compress=3)
    joblib.dump(sv,  paths["svd"],        compress=3)
    np.save(paths["lsa_matrix"], lsa)
    print(f"SVD index cached to {_CACHE_DIR}")

    for fname in os.listdir(_CACHE_DIR):
        if not fname.startswith(fingerprint):
            try:
                os.remove(os.path.join(_CACHE_DIR, fname))
            except OSError:
                pass


def build_svd_matrix(patterns):
    global vectorizer, svd, lsa_matrix, pattern_data

    pattern_data = list(patterns)
    docs = [f"{p.title or ''} {p.description or ''}" for p in pattern_data]

    fingerprint = _cache_fingerprint(docs)
    vec, sv, lsa = _load_cache(fingerprint)

    if vec is not None:
        vectorizer, svd, lsa_matrix = vec, sv, lsa
        build_fuzzy_vocab(pattern_data)
        print(f"Index ready: {len(docs)} docs | LSA dims={lsa_matrix.shape[1]}")
        return

    print("Building SVD index from scratch (first run or data changed)...")

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=2,
        max_df=0.8,
    )
    tfidf_matrix = vectorizer.fit_transform(docs)

    n_components = min(N_COMPONENTS, tfidf_matrix.shape[1] - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    lsa_raw = svd.fit_transform(tfidf_matrix)
    lsa_matrix = normalize(lsa_raw, norm="l2")

    _save_cache(fingerprint, vectorizer, svd, lsa_matrix)
    build_fuzzy_vocab(pattern_data)

    print(
        f"Index built: {len(docs)} docs | "
        f"vocab={tfidf_matrix.shape[1]} | "
        f"LSA dims={lsa_matrix.shape[1]} | "
        f"variance explained={svd.explained_variance_ratio_.sum():.1%}"
    )


def _per_term_lsa_scores(query_tokens: list[str]) -> np.ndarray:
    if not query_tokens:
        return np.zeros(len(pattern_data))

    per_term = []
    for token in query_tokens:
        term_tfidf = vectorizer.transform([token])
        term_lsa = normalize(svd.transform(term_tfidf), norm="l2")
        per_term.append((lsa_matrix @ term_lsa.T).flatten())

    return np.mean(per_term, axis=0)


def _title_any_term_score(query_tokens: list[str], title: str) -> float:
    if not query_tokens or not title:
        return 0.0
    title_tokens = set(_tokenize(title))
    title_stems  = set(stem_word(t) for t in title_tokens)
    for qt in query_tokens:
        if qt in title_tokens or stem_word(qt) in title_stems:
            return 1.0
    return 0.0


def _title_all_term_score(query_tokens: list[str], title: str) -> float:
    if not query_tokens or not title:
        return 0.0
    title_tokens = set(_tokenize(title))
    title_stems  = set(stem_word(t) for t in title_tokens)
    hits = sum(
        1 for qt in query_tokens
        if qt in title_tokens or stem_word(qt) in title_stems
    )
    return hits / len(query_tokens)



def svd_search(query, skill_filter="", top_k=10):
    global vectorizer, svd, lsa_matrix, pattern_data

    if vectorizer is None or not query.strip():
        return []

    corrected_query, stemmed_query = normalize_query(query)
    effective_query = corrected_query if corrected_query.strip() else query
    query_tokens = _tokenize(effective_query)

    query_tfidf = vectorizer.transform([effective_query])
    query_lsa   = normalize(svd.transform(query_tfidf), norm="l2")
    whole_lsa   = (lsa_matrix @ query_lsa.T).flatten()
    per_term    = _per_term_lsa_scores(query_tokens)

    n_terms = max(len(query_tokens), 1)
    pt_w = min(0.3 + 0.1 * (n_terms - 1), 0.6)
    wh_w = 1.0 - pt_w

    results = []
    for i, pattern in enumerate(pattern_data):
        if skill_filter and skill_filter.lower() not in (pattern.skill_level or "").lower():
            continue

        title         = pattern.title or ""
        combined_text = f"{title} {pattern.description or ''}"

        lsa_score     = wh_w * float(whole_lsa[i]) + pt_w * float(per_term[i])
        overlap_score = word_overlap(stemmed_query, combined_text)
        ngram_score   = ngram_sim(stemmed_query, combined_text)
        fuzzy_score   = fuzzy_title_score(query_tokens, title)
        title_any     = _title_any_term_score(query_tokens, title)
        title_all     = _title_all_term_score(query_tokens, title)

        final_score = (
            0.45 * lsa_score
            + 0.10 * overlap_score
            + 0.10 * ngram_score
            + 0.15 * title_any
            + 0.10 * title_all
            + 0.10 * fuzzy_score
        )

        if final_score > 0 or fuzzy_score > 0.7:
            results.append({
                "pattern_obj": pattern,
                "score": max(final_score, fuzzy_score * 0.3),
                "_debug": {
                    "lsa": round(lsa_score, 4),
                    "overlap": round(overlap_score, 4),
                    "ngram": round(ngram_score, 4),
                    "title_any": round(title_any, 4),
                    "title_all": round(title_all, 4),
                    "fuzzy": round(fuzzy_score, 4),
                    "corrected": effective_query,
                },
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return [x for x in results if x["score"] > 0.05][:top_k]