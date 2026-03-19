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

    def __repr__(self):
        return f'Pattern {self.id}: {self.title}'