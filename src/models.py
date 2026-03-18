from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# -- Edits -- 
class Pattern(db.Model):
    __tablename__ = 'episodes'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(64), nullable=False)
    descr = db.Column(db.String(2000), nullable=False)
    full_description = db.Column(db.String(2000), nullable=False)
    pattern_link = db.Column(db.String(1024), nullable=False)
    skill_level = db.Column(db.String(20), nullable= False)
    pattern_link = db.Columns(db.String(100), nullable = False)
    image_path = db.Columns(db.String(50), nullable = False)
    
    def __repr__(self):
        return f'Episode {self.id}: {self.title}'    


# # Define Episode model
# class Episode(db.Model):
#     __tablename__ = 'episodes'
#     id = db.Column(db.Integer, primary_key=True)
#     title = db.Column(db.String(64), nullable=False)
#     descr = db.Column(db.String(1024), nullable=False)
    
#     def __repr__(self):
#         return f'Episode {self.id}: {self.title}'

# # Define Review model
# class Review(db.Model):
#     __tablename__ = 'reviews'
#     id = db.Column(db.Integer, primary_key=True)
#     imdb_rating = db.Column(db.Float, nullable=False)
    
#     def __repr__(self):
#         return f'Review {self.id}: {self.imdb_rating}'

