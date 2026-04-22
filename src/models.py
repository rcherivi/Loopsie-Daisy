from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Pattern(db.Model):
    __tablename__ = 'patterns'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    skill_level = db.Column(db.String(50), nullable=True)
    pattern_link = db.Column(db.String(500), nullable=True)
    final_description = db.Column(db.Text, nullable=True)
    image_path = db.Column(db.String(500), nullable=True)
    upvotes = db.Column(db.Integer, default=0, nullable=False)
    downvotes = db.Column(db.Integer, default=0, nullable=False)

    @property
    def vote_score(self):
        return self.upvotes - self.downvotes

    def to_dict(self, score=None):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "skill_level": self.skill_level,
            "pattern_link": self.pattern_link,
            "final_description": self.final_description,
            "image_path": self.image_path,
            "upvotes": self.upvotes,
            "downvotes": self.downvotes,
            "score": score if score is not None else self.vote_score,
        }

    def __repr__(self):
        return f'Pattern {self.id}: {self.title}'


class Vote(db.Model):
    __tablename__ = 'votes'

    id = db.Column(db.Integer, primary_key=True)
    session_token = db.Column(db.String(128), nullable=False, index=True)
    pattern_id = db.Column(db.Integer, db.ForeignKey('patterns.id'), nullable=False)
    vote_type = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('session_token', 'pattern_id', name='uq_session_pattern'),
    )

    def __repr__(self):
        return f'Vote(session={self.session_token[:8]}... pattern={self.pattern_id} type={self.vote_type})'