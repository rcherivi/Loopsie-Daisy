import csv
import json
import os
from dotenv import load_dotenv
from flask import Flask

load_dotenv()
from flask_cors import CORS
from models import db, Pattern
from routes import register_routes

# src/ directory and project root (one level up)
current_directory = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_directory)

# Serve React build files from <project_root>/frontend/dist
app = Flask(__name__,
    static_folder=os.path.join(project_root, 'frontend', 'dist'),
    static_url_path='')
CORS(app)

# Configure SQLite database - using 3 slashes for relative path
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database with app
db.init_app(app)

# Register routes
register_routes(app)

# Function to initialize database, change this to your own database initialization logic
def init_db():
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Initialize database with data from init.json if empty
        if Pattern.query.count() == 0:
            # json_file_path = os.path.join(current_directory, 'init.json')
            csv_file_path = os.path.join(current_directory, 'all_patterns_combined.csv')

            with open(csv_file_path, newline='', encoding='utf-8') as file:
                reader = csv.DictReader(file)

                for row in reader:
                    pattern = Pattern(
                        title=row['title'],
                        description=row['description'],
                        skill_level=row['skill_level'],
                        pattern_link=row['pattern_link']
                    )
                    db.session.add(pattern)

            db.session.commit()
            print("Database initialized with pattern data")

init_db()

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5001)
