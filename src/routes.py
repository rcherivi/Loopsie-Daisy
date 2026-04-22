"""
Routes: React app serving and episode search API.

To enable AI chat, set USE_LLM = True below. See llm_routes.py for AI code.
"""
import json
import os
from flask import send_from_directory, request, jsonify
from models import db, Pattern
import re
from collections import Counter
import math
from ngram_search import ngram_sim, word_overlap_score
from llm_routes import modify_search_query, summarize_results
from tfidf_search import build_index, search

# Ying changes
from svd import build_svd_matrix, svd_search

# ── AI toggle ────────────────────────────────────────────────────────────────
#USE_LLM = False
USE_LLM = True
# ─────────────────────────────────────────────────────────────────────────────


# def json_search(query):
#     if not query or not query.strip():
#         query = "Kardashian"

#     results = Pattern.query.filter(
#         Pattern.title.ilike(f"%{query}%")
#     ).all()

#     matches = []
#     for pattern in results:
#         matches.append({
#             "title": pattern.title,
#             "description": pattern.description,
#             "skill_level": pattern.skill_level,
#             "pattern_link": pattern.pattern_link, 
#             "final_description": pattern.final_description,
#             "image_path": pattern.image_path
#         })
#     return matches

# def json_search(query):
#     text = request.args.get("title", "")
#     skill = request.args.get("skill", "")
#     query = Pattern.query

#     # text search
#     if text:
#         query = query.filter(Pattern.title.ilike(f"%{text[:3]}%"))

#     # skill filter
#     if skill:
#         query = query.filter(Pattern.skill_level.ilike(f"%{skill}%"))

#     results = query.all()

#     scored_matches = []
#     for pattern in results:
#         title = pattern.title or ""
#         description = pattern.description or ""

#         title_score = ngram_sim(text, title)
#         word_score = word_overlap_score(text, title)
#         description_score = ngram_sim(text, description)

#         score = 0.6 * title_score + 0.1 * word_score + 0.3 * description_score
 
#         if score > 0:
#             scored_matches.append({
#                 'title':  pattern.title,
#                 'description': pattern.description,
#                 'skill_level': pattern.skill_level,
#                 'pattern_link': pattern.pattern_link,
#                 "final_description": pattern.final_description,
#                 "image_path": pattern.image_path,
#                 'score': score
#             })
            
#     scored_matches.sort(key=lambda x: x['score'], reverse = True)

#     return scored_matches[:10]

def json_search():

    raw_query = request.args.get("title", "")
    skill = request.args.get("skill", "")
    top_k = request.args.get("top_k", default=10, type=int)

    if USE_LLM and raw_query:
        search_query = modify_search_query(raw_query)
        print(f"Original Query: {raw_query} | Modified for SVD: {search_query}")
    else:
        search_query = raw_query

    raw_results = svd_search(search_query, skill, top_k) or []
    summary = summarize_results(raw_results, search_query)
    formatted_results = []
    for item in raw_results:
        p = item["pattern_obj"]
        formatted_results.append(p.to_dict(score=float(item["score"])))

    return formatted_results, summary

def register_routes(app):
    @app.before_first_request
    def initialize():
        patterns = Pattern.query.all()
        # build_index(patterns)
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
    #def patterns_search():
        #return jsonify(json_search())
    # changed to return IR summary and best match as well
    def patterns_search():
        formatted_results, summary = json_search()
        return jsonify({
            "results": formatted_results,
            "summary": summary.get("summary", ""),
            "best_match": summary.get("best_match", None)})

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
        vote_type = data.get("vote")  # 'up' or 'down'
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


# def json_search(query):
#     if not query or not query.strip():
#         query = "Kardashian"
#     results = db.session.query(Episode, Review).join(
#         Review, Episode.id == Review.id
#     ).filter(
#         Episode.title.ilike(f'%{query}%')
#     ).all()
#     matches = []
#     for episode, review in results:
#         matches.append({
#             'title': episode.title,
#             'descr': episode.descr,
#             'imdb_rating': review.imdb_rating
#         })
#     return matches


# def register_routes(app):
#     @app.route('/', defaults={'path': ''})
#     @app.route('/<path:path>')
#     def serve(path):
#         if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
#             return send_from_directory(app.static_folder, path)
#         else:
#             return send_from_directory(app.static_folder, 'index.html')

#     @app.route("/api/config")
#     def config():
#         return jsonify({"use_llm": USE_LLM})

#     @app.route("/api/episodes")
#     def episodes_search():
#         text = request.args.get("title", "")
#         return jsonify(json_search(text))

#     if USE_LLM:
#         from llm_routes import register_chat_route
#         register_chat_route(app, json_search)