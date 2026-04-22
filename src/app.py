import csv
import json
import os
from dotenv import load_dotenv
from flask import Flask

load_dotenv()
from flask_cors import CORS
from models import db, Pattern, Vote  
from routes import register_routes

current_directory = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_directory)

app = Flask(__name__,
    static_folder=os.path.join(project_root, 'frontend', 'dist'),
    static_url_path='')
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def init_db():
    with app.app_context():
        db.create_all()

        if Pattern.query.count() == 0:
            csv_file_path = os.path.join(current_directory, 'all_patterns_combined.csv')

            with open(csv_file_path, newline='', encoding='utf-8') as file:
                reader = csv.DictReader(file)

                for row in reader:
                    pattern = Pattern(
                        title=row['title'],
                        description=row['description'],
                        skill_level=row['skill_level'],
                        pattern_link=row['pattern_link'],
                        final_description=row['final_description'],
                        image_path=row['local_path']
                    )
                    db.session.add(pattern)

        db.session.commit()
        print("Database initialized with pattern data")

init_db()

register_routes(app)

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5001)


# if db is not initialized again, run the following command in terminal to delete the database
# Remove-Item .\instance\data.db