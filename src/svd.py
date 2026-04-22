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

_rocchio_deltas: dict[int, float] = {}


ROCCHIO_ALPHA = 0.02


ROCCHIO_CAP = 0.30


def apply_rocchio_vote(pattern_index: int, vote_type: str) -> None:

    delta = ROCCHIO_ALPHA if vote_type == "up" else -ROCCHIO_ALPHA
    current = _rocchio_deltas.get(pattern_index, 0.0)
    updated = current + delta
    _rocchio_deltas[pattern_index] = max(-ROCCHIO_CAP, min(ROCCHIO_CAP, updated))


def rebuild_rocchio_from_db(votes) -> None:
    global _rocchio_deltas, pattern_data
    _rocchio_deltas.clear()

    id_to_index = {p.id: i for i, p in enumerate(pattern_data)}

    for vote in votes:
        idx = id_to_index.get(vote.pattern_id)
        if idx is None:
            continue
        delta = ROCCHIO_ALPHA if vote.vote_type == "up" else -ROCCHIO_ALPHA
        current = _rocchio_deltas.get(idx, 0.0)
        _rocchio_deltas[idx] = max(-ROCCHIO_CAP, min(ROCCHIO_CAP, current + delta))


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
    query_weights = query_lsa[0]

    lsa_scores = (lsa_matrix @ query_lsa.T).flatten()

    indices = np.arange(len(pattern_data))
    if skill_filter:
        skill_filter_lower = skill_filter.lower()
        indices = np.array([
            i for i in indices
            if skill_filter_lower in (pattern_data[i].skill_level or "").lower()
        ])

    # Only keep patterns with positive LSA scores
    positive_mask = lsa_scores[indices] > 0
    indices = indices[positive_mask]

    if len(indices) == 0:
        return []

    # Slice lsa_scores down to the filtered index set so all arrays share the same shape
    lsa_scores_filtered = lsa_scores[indices]

    titles = [pattern_data[i].title for i in indices]
    ngram_score    = np.array([ngram_sim(stemmed_query, f"{pattern_data[i].title} {pattern_data[i].description}") for i in indices])
    fuzzy_score    = np.array([fuzzy_title_score(query_tokens, title) for title in titles])
    title_any      = np.array([_title_any_term_score(query_tokens, title) for title in titles])
    title_all      = np.array([_title_all_term_score(query_tokens, title) for title in titles])
    rocchio_deltas = np.array([_rocchio_deltas.get(i, 0.0) for i in indices])

    final_scores = (
        0.55 * lsa_scores_filtered
        + 0.10 * ngram_score
        + 0.15 * title_any
        + 0.10 * title_all
        + 0.10 * fuzzy_score
        + rocchio_deltas
    )

    # Filter to top 80th percentile; also enforce a minimum threshold
    # to prevent returning irrelevant results when scores are generally low
    threshold = np.percentile(final_scores, 80)
    keep_mask     = (final_scores > threshold) & (final_scores > 0.05)
    kept_indices  = indices[keep_mask]
    kept_scores   = final_scores[keep_mask]
    kept_lsa      = lsa_scores_filtered[keep_mask]
    kept_fuzzy    = fuzzy_score[keep_mask]

    if len(kept_indices) == 0:
        return []

    sort_order          = np.argsort(kept_scores)[::-1][:top_k]
    final_indices       = kept_indices[sort_order]
    final_scores_sorted = kept_scores[sort_order]

    # Per-pattern: find top 3 contributing latent dimensions and summarize each
    pattern_lsa_matrix     = lsa_matrix[final_indices]
    dim_contributions      = pattern_lsa_matrix * query_weights  # shape (k, n_components)
    top_3_dims_per_pattern = np.argsort(dim_contributions, axis=1)[:, ::-1][:, :3]
    dim_words_per_pattern  = [
        [get_top_words_for_dim(dim_idx, top_n=10) for dim_idx in top_3_dims]
        for top_3_dims in top_3_dims_per_pattern
    ]

    results = []
    for rank, (pat_idx, score) in enumerate(zip(final_indices, final_scores_sorted)):
        i_in_sort = sort_order[rank]
        fuzz = kept_fuzzy[i_in_sort]
        results.append({
            "pattern_obj":   pattern_data[pat_idx],
            "score":         max(score, fuzz * 0.3) if fuzz > 0.7 else score,
            "dim_summaries": dim_words_per_pattern[rank],
            "_debug": {
                "lsa":      round(float(kept_lsa[i_in_sort]), 4),
                "top_dims": top_3_dims_per_pattern[rank].tolist(),
            },
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return [x for x in results if x["score"] > 0.05][:top_k]


def get_top_words_for_dim(dim_idx, top_n=10):
    """Returns the top words associated with a specific latent dimension."""
    global vectorizer, svd
    if not vectorizer or not svd:
        return []

    feature_names = vectorizer.get_feature_names_out()
    top_word_indices = svd.components_[dim_idx].argsort()[::-1][:top_n]
    return [feature_names[i] for i in top_word_indices]