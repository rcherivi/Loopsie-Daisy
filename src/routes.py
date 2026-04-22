import os
from flask import send_from_directory, request, jsonify
from models import db, Pattern, Vote
from ngram_search import ngram_sim, word_overlap_score
from tfidf_search import build_index, search
from svd import build_svd_matrix, svd_search, apply_rocchio_vote, rebuild_rocchio_from_db

USE_LLM = False

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
    query = request.args.get("title", "")
    skill = request.args.get("skill", "")
    top_k = request.args.get("top_k", default=10, type=int)
    token = _get_session_token()

    raw_results = svd_search(query, skill, top_k) or []

    pattern_ids = [item["pattern_obj"].id for item in raw_results]
    scores_by_id = {item["pattern_obj"].id: item["score"] for item in raw_results}

    fresh_patterns = {p.id: p for p in Pattern.query.filter(Pattern.id.in_(pattern_ids)).all()}
    user_votes = _user_votes_for_patterns(pattern_ids, token)

    formatted_results = []
    for pid in pattern_ids:
        p = fresh_patterns.get(pid)
        if p is None:
            continue
        d = p.to_dict(score=float(scores_by_id[pid]))
        d["user_vote"] = user_votes.get(pid, None)
        formatted_results.append(d)

    return formatted_results


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
        return jsonify(json_search())

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
        return send_from_directory(filename)

    if USE_LLM:
        from llm_routes import register_chat_route
        register_chat_route(app, json_search)