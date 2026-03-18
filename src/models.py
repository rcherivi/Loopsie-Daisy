from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Define Episode model
class Episode(db.Model):
    __tablename__ = 'episodes'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(64), nullable=False)
    descr = db.Column(db.String(1024), nullable=False)
    
    def __repr__(self):
        return f'Episode {self.id}: {self.title}'

# Define Review model
class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    imdb_rating = db.Column(db.Float, nullable=False)
    
    def __repr__(self):
        return f'Review {self.id}: {self.imdb_rating}'

# Define crochet Pattern model
class Pattern(db.Model):
    __tablename__ = 'patterns'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    skill_level = db.Column(db.String(50), nullable=True)
    pattern_link = db.Column(db.String(500), nullable=True)

    def __repr__(self):
        return f'Pattern {self.id}: {self.title}'