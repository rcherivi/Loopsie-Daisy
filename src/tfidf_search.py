from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from ngram_search import ngram_sim
from rapidfuzz import fuzz


vectorizer = None
tfidf_matrix = None
pattern_data = []

def build_index(patterns):
  global vectorizer, tfidf_matrix, pattern_data

  docs = []
  pattern_data = []

  for p in patterns:
    title = p.title or ""
    description = p.description or ""

    combined = f"{title} {description}"

    docs.append(combined)
    pattern_data.append(p)

  vectorizer = TfidfVectorizer(
    stop_words = "english",
    ngram_range = (1,2)
  )

  tfidf_matrix = vectorizer.fit_transform(docs)

def word_overlap(query, doc):
  q_words = set(query.lower().split())
  d_words = set(doc.lower().split())

  if not q_words:
    return 0
  
  return len(q_words & d_words) / len(q_words)

def fuzzy_score(query, doc):
    return fuzz.token_set_ratio(query, doc) / 100
  
def search(query, skill_filter=""):
  global vectorizer, tfidf_matrix, pattern_data

  if vectorizer is None or not query.strip():
    return []
  
  query_vec = vectorizer.transform([query])
  scores = cosine_similarity(query_vec, tfidf_matrix)[0]

  results = []
  for i, tfidf_score in enumerate(scores):
    pattern = pattern_data[i]

    if skill_filter and skill_filter.lower() not in (pattern.skill_level or "").lower():
      continue

    if tfidf_score > 0:
      combined_text = f"{pattern.title} {pattern.description}"
      overlap_score = word_overlap(query, combined_text)
      ngram_score = ngram_sim(query, combined_text)
      fuzzy_scores = fuzzy_score(query, combined_text)

      final_score = 0.3 * tfidf_score + 0.2 * overlap_score + 0.5 * ngram_score      
      # final_score = 0.5 * tfidf_score + 0.2 * overlap_score + 0.3 * fuzzy_scores

      results.append({
        "title": pattern.title,
        "description": pattern.description,
        "skill_level": pattern.skill_level,
        "pattern_link": pattern.pattern_link,
        "final_description": pattern.final_description,
        "image_path": pattern.image_path,
        "score": float(final_score)
      })

  results.sort(key = lambda x: x["score"], reverse=True)
  return results[:10]