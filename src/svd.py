import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity
from ngram_search import ngram_sim
from llm_routes import summarize_latent_dim
from tfidf_search import word_overlap


vectorizer = None
svd = None
# latent semantics (with tfidf applied)
lsa_matrix = None
pattern_data = []

# number of latent dimensions
N_COMPONENTS = 600


def build_svd_matrix(patterns):
    global vectorizer, svd, lsa_matrix, pattern_data

    docs = []
    pattern_data = []

    for p in patterns:
        title = p.title or ""
        description = p.description or ""
        docs.append(f"{title} {description}")
        pattern_data.append(p)

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=2,
        max_df=0.8,
    )
    tfidf_matrix = vectorizer.fit_transform(docs)

    # SVD dimension reduction
    n_components = min(N_COMPONENTS, tfidf_matrix.shape[1] - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    lsa_raw = svd.fit_transform(tfidf_matrix)

    # plot_optimal_k(patterns, max_k=min(1000, tfidf_matrix.shape[1] - 1))

    # Normalizing the vectors for cosine similarity for pattern matching stage
    lsa_matrix = normalize(lsa_raw, norm="l2")

    print(
        f"Index built: {len(docs)} docs | "
        f"vocab={tfidf_matrix.shape[1]} | "
        f"LSA dims={lsa_matrix.shape[1]} | "
        f"variance explained={svd.explained_variance_ratio_.sum():.1%}"
    )

def svd_search(query, skill_filter="", top_k=10):
    global vectorizer, svd, lsa_matrix, pattern_data

    if vectorizer is None or not query.strip():
        return []

    query_tfidf = vectorizer.transform([query])
    query_lsa = normalize(svd.transform(query_tfidf), norm="l2")  # shape (1, n_components)
    query_weights = query_lsa[0]

    lsa_scores = (lsa_matrix @ query_lsa.T).flatten()

    # Apply skill filter
    indices = np.arange(len(pattern_data))
    if skill_filter:
        skill_filter_lower = skill_filter.lower()
        indices = np.array([
            i for i in indices
            if skill_filter_lower in (pattern_data[i].skill_level or "").lower()
        ])
    # Only want positive scores
    positive_mask = lsa_scores[indices] > 0
    indices = indices[positive_mask]

    if len(indices) == 0:
        return []

    # Vectorized text scoring (to uplift similar categories (hats, bags, etc.) and avoid matching based on adjectives only)
    titles = [pattern_data[i].title for i in indices]
    title_overlap_scores = np.array([word_overlap(query, t) for t in titles])

    final_scores = (
        0.8  * lsa_scores[indices]
        + 0.2  * title_overlap_scores
    )

    # Filter to top 80th percentile and if the scores are generally bad, then have a minimum threshold to prevent returning irrelevant results
    threshold = np.percentile(final_scores, 80)
    keep_mask = (final_scores > threshold) & (final_scores > 0.05)
    kept_indices  = indices[keep_mask]
    kept_scores   = final_scores[keep_mask]
    kept_lsa      = lsa_scores[kept_indices]
    kept_overlaps = title_overlap_scores[keep_mask]

    sort_order   = np.argsort(kept_scores)[::-1][:top_k]
    final_indices = kept_indices[sort_order]
    final_scores_sorted = kept_scores[sort_order]

    # Per-pattern: find top 3 contributing latent dimensions and then summarizing each
    pattern_lsa_matrix = lsa_matrix[final_indices]
    dim_contributions  = pattern_lsa_matrix * query_weights  # shape (k, n_components)
    top_3_dims_per_pattern = np.argsort(dim_contributions, axis=1)[:, ::-1][:, :3]
    dim_words_per_pattern = [
        [get_top_words_for_dim(dim_idx, top_n=10) for dim_idx in top_3_dims]
        for top_3_dims in top_3_dims_per_pattern
    ]
    dim_summaries = [
        summarize_latent_dim(word_lists)
        for word_lists in dim_words_per_pattern
    ]

    for i, (pat_idx, labels) in enumerate(zip(final_indices, dim_summaries)):
        print(f"Pattern {i+1}: {pattern_data[pat_idx].title} → {labels}")

    results = []
    for rank, (pat_idx, score) in enumerate(zip(final_indices, final_scores_sorted)):
        i_in_kept = sort_order[rank]
        results.append({
            "pattern_obj": pattern_data[pat_idx],
            "score": float(score),
            "dim_summaries": dim_summaries[rank],
            "_debug": {
                "lsa":      round(float(kept_lsa[i_in_kept]), 4),
                "overlap":  round(float(kept_overlaps[i_in_kept]), 4),
                "top_dims": top_3_dims_per_pattern[rank].tolist(),
            },
        })

    return results


def get_top_words_for_dim(dim_idx, top_n=10):
    """Returns the top words associated with a specific latent dimension."""
    global vectorizer, svd
    if not vectorizer or not svd:
        return []
    
    feature_names = vectorizer.get_feature_names_out()
    top_word_indices = svd.components_[dim_idx].argsort()[::-1][:top_n]
    return [feature_names[i] for i in top_word_indices]

# old functions
# def svd_search(query, skill_filter="", top_k = 10):
#     global vectorizer, svd, lsa_matrix, pattern_data

#     if vectorizer is None or not query.strip():
#         return []


#     query_tfidf = vectorizer.transform([query])
#     query_lsa = normalize(svd.transform(query_tfidf), norm="l2")

#     query_weights = query_lsa[0]
#     # Get the indices of the 2 dimensions with the highest alignment to the query
#     top_2_dim_indices = query_weights.argsort()[::-1][:2]
    
#     dim_words_list = []
#     for dim_idx in top_2_dim_indices:
#         words = get_top_words_for_dim(dim_idx, top_n=15) # Grab top 15 words
#         dim_words_list.append(words)

#     lsa_scores = (lsa_matrix @ query_lsa.T).flatten()

#     results = []
#     for i, lsa_score in enumerate(lsa_scores):
#         pattern = pattern_data[i]

#         if skill_filter and skill_filter.lower() not in (pattern.skill_level or "").lower():
#             continue

#         if lsa_score > 0:
#             combined_text = f"{pattern.title} {pattern.description}"
#             overlap_score = word_overlap(query, combined_text)
#             ngram_score   = ngram_sim(query, combined_text)

#             title_overlap_score = word_overlap(query, pattern.title)

#             final_score = (
#                 0.6 * lsa_score
#                 + 0.15 * overlap_score
#                 + 0.15 * ngram_score
#                 + 0.1 * title_overlap_score
#             )

#             results.append({
#                 "pattern_obj": pattern,
#                 "score": final_score,
#                 "_debug": {
#                     "lsa": round(float(lsa_score), 4),
#                     "overlap": round(overlap_score, 4),
#                     "ngram": round(ngram_score, 4),
#                 },
#             })

#     results.sort(key=lambda x: x["score"], reverse=True)
#     threshold = np.percentile([r["score"] for r in results], 80)
#     # setting dynamic threshold to filter out low-quality matches
#     filtered = [x for x in results if x["score"] > threshold]
#     return filtered[:top_k]

