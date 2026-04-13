from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Define crochet Pattern model
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