import os
from flask import send_from_directory, request, jsonify
from models import db, Pattern
from ngram_search import ngram_sim, word_overlap_score
from tfidf_search import build_index, search
from svd import build_svd_matrix, svd_search

USE_LLM = False


def json_search():
    query = request.args.get("title", "")
    skill = request.args.get("skill", "")
    top_k = request.args.get("top_k", default=10, type=int)

    raw_results = svd_search(query, skill, top_k) or []

    formatted_results = []
    for item in raw_results:
        p = item["pattern_obj"]
        formatted_results.append(p.to_dict(score=float(item["score"])))

    return formatted_results


def register_routes(app):
    with app.app_context():
        patterns = Pattern.query.all()
        build_svd_matrix(patterns)

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
        patterns = Pattern.query.order_by(
            (Pattern.upvotes - Pattern.downvotes).desc(),
            Pattern.upvotes.desc()
        ).limit(top_k).all()
        return jsonify([p.to_dict() for p in patterns])

    @app.route("/api/patterns/<int:pattern_id>/vote", methods=["POST"])
    def vote_pattern(pattern_id):
        data = request.get_json()
        vote_type = data.get("vote")
        pattern = Pattern.query.get_or_404(pattern_id)
        if vote_type == "up":
            pattern.upvotes += 1
        elif vote_type == "down":
            pattern.downvotes += 1
        else:
            return jsonify({"error": "Invalid vote type"}), 400
        db.session.commit()
        return jsonify({
            "id": pattern.id,
            "upvotes": pattern.upvotes,
            "downvotes": pattern.downvotes,
            "vote_score": pattern.vote_score,
        })

    @app.route('/images/<path:filename>')
    def get_image(filename):
        return send_from_directory(filename)

    if USE_LLM:
        from llm_routes import register_chat_route
        register_chat_route(app, json_search)