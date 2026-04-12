# import matplotlib
# matplotlib.use("agg")
# import matplotlib.pyplot as plt

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity
from ngram_search import ngram_sim

from tfidf_search import word_overlap


vectorizer = None
svd = None
# latent semantics (with tfidf applied)
lsa_matrix = None
pattern_data = []

# number of latent dimensions
N_COMPONENTS = 600


import numpy as np
#import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD

""" def plot_optimal_k(patterns, max_k=1000):
    docs = [f"{p.title or ''} {p.description or ''}" for p in patterns]

#     vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True, min_df=2)
#     tfidf_matrix = vectorizer.fit_transform(docs)

#     max_k = min(max_k, tfidf_matrix.shape[1] - 1)

#     svd = TruncatedSVD(n_components=max_k, random_state=42)
#     svd.fit(tfidf_matrix)

#     cumvar = np.cumsum(svd.explained_variance_ratio_)
#     ks = np.arange(1, max_k + 1)

#     fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

#     ax1.plot(ks, cumvar, linewidth=2)
#     for threshold in [0.5, 0.7, 0.8]:
#         k_thresh = np.searchsorted(cumvar, threshold) + 1
#         ax1.axhline(threshold, linestyle="--", alpha=0.5, label=f"{int(threshold*100)}% → k={k_thresh}")
#         ax1.axvline(k_thresh, linestyle="--", alpha=0.3)
#     ax1.set_xlabel("Number of components (k)")
#     ax1.set_ylabel("Cumulative explained variance")
#     ax1.set_title("Elbow: pick k where curve flattens")
#     ax1.legend()
#     ax1.grid(alpha=0.3)

#     ax2.plot(ks, svd.explained_variance_ratio_, linewidth=1.5, color="steelblue")
#     ax2.set_xlabel("Component index")
#     ax2.set_ylabel("Variance explained by component")
#     ax2.set_title("Scree plot: look for the 'drop-off'")
#     ax2.grid(alpha=0.3)

#     plt.tight_layout()
#     plt.savefig("optimal_k.png", dpi=150)
#     plt.close()  # free memory

    for t in [0.5, 0.6, 0.7, 0.8, 0.9]:
        k = np.searchsorted(cumvar, t) + 1
        print(f"  {int(t*100)}% variance explained at k={k}") """

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



def svd_search(query, skill_filter=""):
    global vectorizer, svd, lsa_matrix, pattern_data

    if vectorizer is None or not query.strip():
        return []


    query_tfidf = vectorizer.transform([query])
    query_lsa = normalize(svd.transform(query_tfidf), norm="l2")

    lsa_scores = (lsa_matrix @ query_lsa.T).flatten()

    results = []
    for i, lsa_score in enumerate(lsa_scores):
        pattern = pattern_data[i]

        if skill_filter and skill_filter.lower() not in (pattern.skill_level or "").lower():
            continue

        if lsa_score > 0:
            combined_text = f"{pattern.title} {pattern.description}"
            overlap_score = word_overlap(query, combined_text)
            ngram_score   = ngram_sim(query, combined_text)

            title_overlap_score = word_overlap(query, pattern.title)

            final_score = (
                0.6 * lsa_score
                + 0.15 * overlap_score
                + 0.15 * ngram_score
                + 0.1 * title_overlap_score
            )

            results.append({
                "pattern_obj": pattern,
                "score": final_score,
                "_debug": {
                    "lsa": round(float(lsa_score), 4),
                    "overlap": round(overlap_score, 4),
                    "ngram": round(ngram_score, 4),
                },
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:10]