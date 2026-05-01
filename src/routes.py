import os
from flask import send_from_directory, request, jsonify
from models import db, Pattern, Vote
from ngram_search import ngram_sim, word_overlap_score
from llm_routes import modify_search_query, summarize_results
from tfidf_search import build_index, search
from svd import build_svd_matrix, svd_search, apply_rocchio_vote, rebuild_rocchio_from_db, transform_query, get_top_dimensions
from functools import lru_cache
import threading


USE_LLM = True  # Set to False to disable LLM features and use raw search instead

_query_cache: dict[tuple[str, str | None], str] = {}
_query_cache_lock = threading.Lock()

def _get_modified_query(raw_query: str, token: str | None) -> str:
    """Return cached modified query, or call LLM and cache the result."""
    cache_key = (raw_query.strip().lower(), token)
    with _query_cache_lock:
        if cache_key in _query_cache:
            print(f"Cache hit for query='{raw_query}' token={token}")
            return _query_cache[cache_key]
    
    modified = modify_search_query(raw_query)
    
    with _query_cache_lock:
        _query_cache[cache_key] = modified
    return modified

def _get_session_token() -> str | None:
    token = request.headers.get("X-Session-Token", "").strip()
    return token if token else None


def _user_votes_for_patterns(pattern_ids: list[int], token: str | None) -> dict[int, str]:
    """
    Single DB query: returns {pattern_id: vote_type} for all given IDs
    that the session has voted on.  Returns empty dict if no token.
    """
    if not token or not pattern_ids:
        return {}
    rows = Vote.query.filter(
        Vote.session_token == token,
        Vote.pattern_id.in_(pattern_ids),
    ).all()
    return {v.pattern_id: v.vote_type for v in rows}


def json_search():

    raw_query = request.args.get("title", "")
    skill = request.args.get("skill", "")
    top_k = request.args.get("top_k", default=10, type=int)
    token = _get_session_token()

    if USE_LLM and raw_query:
        search_query = _get_modified_query(raw_query, token)
        print(f"Original Query: {raw_query} | Modified for SVD: {search_query}")
    else:
        search_query = raw_query

    raw_results = svd_search(search_query, skill, top_k) or []
    pattern_ids = [item["pattern_obj"].id for item in raw_results]

    fresh_patterns = {p.id: p for p in Pattern.query.filter(Pattern.id.in_(pattern_ids)).all()}
    user_votes = _user_votes_for_patterns(pattern_ids, token)

    formatted_results = []
    for item in raw_results:
        pid = item["pattern_obj"].id
        p = fresh_patterns.get(pid)
        if p is None:
            continue
        d = p.to_dict(score=float(item["score"]))
        d["user_vote"] = user_votes.get(pid, None)
        d["explanation"] = item.get("explanation", {})
        formatted_results.append(d)

    return formatted_results


def _extract_recommended_pattern_titles(text: str, known_titles: list[str]) -> list[str]:
    """
    Given the full LLM reply text and the list of known pattern titles,
    return the subset of titles the LLM explicitly mentioned (case-insensitive).
    Falls back to heuristic line-extraction if no known title is found.
    """
    lower_text = text.lower()
    matched = [t for t in known_titles if t.lower() in lower_text]
    if matched:
        return matched

    # Heuristic: extract "1. Title", "- Title", "* Title" lines
    import re
    titles = []
    for line in text.splitlines():
        m = re.match(r"^\s*(?:\d+\.|[-*•])\s+(.+)", line)
        if m:
            candidate = m.group(1).strip().split("—")[0].split(" - ")[0].strip()
            if 3 < len(candidate) < 120:
                titles.append(candidate)
    return titles


def register_routes(app):
    with app.app_context():
        patterns = Pattern.query.all()
        build_svd_matrix(patterns)
        rebuild_rocchio_from_db(Vote.query.all())

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

    @app.route("/api/config")
    def config():
        return jsonify({"use_llm": USE_LLM})

    @app.route("/api/patterns")
    def patterns_search():
        formatted_results = json_search()
        raw_query = request.args.get("title", "")
        token = _get_session_token()
        modified_query = _get_modified_query(raw_query, token) if USE_LLM and raw_query else raw_query
        return jsonify({
            "results": formatted_results,
            "modified_query": modified_query,
        })

    @app.route("/api/patterns/summarize", methods=["POST"])
    def patterns_summarize():
        """Called on-demand when the user clicks 'Show AI Summary'."""
        data = request.get_json()
        query = data.get("query", "")
        pattern_titles = data.get("pattern_titles", [])

        class _P:
            def __init__(self, title): self.title = title
        mock_results = [{"pattern_obj": _P(t), "score": 0} for t in pattern_titles]

        summary = summarize_results(mock_results, query)
        return jsonify({
            "summary": summary.get("summary", ""),
            "best_match": summary.get("best_match", None),
        })

    @app.route("/api/patterns/trending")
    def patterns_trending():
        top_k = request.args.get("top_k", default=12, type=int)
        token = _get_session_token()
        patterns = Pattern.query.order_by(
            (Pattern.upvotes - Pattern.downvotes).desc(),
            Pattern.upvotes.desc()
        ).limit(top_k).all()
        user_votes = _user_votes_for_patterns([p.id for p in patterns], token)
        result = []
        for p in patterns:
            d = p.to_dict()
            d["user_vote"] = user_votes.get(p.id, None)
            result.append(d)
        return jsonify(result)

    @app.route("/api/patterns/<int:pattern_id>/vote", methods=["GET"])
    def get_vote(pattern_id):
        token = _get_session_token()
        if not token:
            return jsonify({"user_vote": None})
        existing = Vote.query.filter_by(session_token=token, pattern_id=pattern_id).first()
        return jsonify({"user_vote": existing.vote_type if existing else None})

    @app.route("/api/patterns/<int:pattern_id>/vote", methods=["POST"])
    def vote_pattern(pattern_id):
        token = _get_session_token()
        if not token:
            return jsonify({"error": "Missing X-Session-Token header"}), 401

        data = request.get_json()
        vote_type = data.get("vote")
        if vote_type not in ("up", "down"):
            return jsonify({"error": "Invalid vote type — use 'up' or 'down'"}), 400

        pattern = Pattern.query.get_or_404(pattern_id)
        existing = Vote.query.filter_by(session_token=token, pattern_id=pattern_id).first()

        from svd import pattern_data
        idx = next((i for i, p in enumerate(pattern_data) if p.id == pattern_id), None)

        if existing:
            if existing.vote_type == vote_type:
                if vote_type == "up":
                    pattern.upvotes = max(0, pattern.upvotes - 1)
                else:
                    pattern.downvotes = max(0, pattern.downvotes - 1)
                if idx is not None:
                    apply_rocchio_vote(idx, "down" if vote_type == "up" else "up")
                db.session.delete(existing)
                db.session.commit()
                return jsonify({
                    "id": pattern.id,
                    "upvotes": pattern.upvotes,
                    "downvotes": pattern.downvotes,
                    "vote_score": pattern.vote_score,
                    "user_vote": None,
                })
            else:
                if existing.vote_type == "up":
                    pattern.upvotes = max(0, pattern.upvotes - 1)
                    pattern.downvotes += 1
                else:
                    pattern.downvotes = max(0, pattern.downvotes - 1)
                    pattern.upvotes += 1
                if idx is not None:
                    apply_rocchio_vote(idx, "down" if existing.vote_type == "up" else "up")
                    apply_rocchio_vote(idx, vote_type)
                existing.vote_type = vote_type
                db.session.commit()
                return jsonify({
                    "id": pattern.id,
                    "upvotes": pattern.upvotes,
                    "downvotes": pattern.downvotes,
                    "vote_score": pattern.vote_score,
                    "user_vote": vote_type,
                })

        # First-time vote
        if vote_type == "up":
            pattern.upvotes += 1
        else:
            pattern.downvotes += 1
        db.session.add(Vote(session_token=token, pattern_id=pattern_id, vote_type=vote_type))
        if idx is not None:
            apply_rocchio_vote(idx, vote_type)
        db.session.commit()
        return jsonify({
            "id": pattern.id,
            "upvotes": pattern.upvotes,
            "downvotes": pattern.downvotes,
            "vote_score": pattern.vote_score,
            "user_vote": vote_type,
        })

    @app.route('/images/<path:filename>')
    def get_image(filename):
        images_dir = os.path.join(app.static_folder, 'images')
        return send_from_directory(images_dir, filename)

    if USE_LLM:
        from llm_routes import register_chat_route

        # Wrap register_chat_route so we can inject the recommended_patterns SSE
        # event after the stream completes, based on known pattern titles.
        def _json_search_with_recs():
            """
            Run the standard search and return results *plus* all known titles
            so the chat route can match them against the LLM reply.
            """
            return json_search()

        register_chat_route(app, _json_search_with_recs)

    # top dimensions of each search query
    @app.route("/api/query-dimensions")
    def query_dimensions():
        query = request.args.get("title", "")

        if not query.strip():
            return jsonify([])

        query_lsa = transform_query(query)
        dims = get_top_dimensions(query_lsa)

        return jsonify(dims)