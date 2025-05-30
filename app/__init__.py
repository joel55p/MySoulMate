# app/__init__.py - Flask Application Factory
import os
from flask import Flask
from flask_login import LoginManager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize extensions
login_manager = LoginManager()

def create_app():
    """Create and configure Flask application"""
    # Specify template and static directories
    app = Flask(__name__, 
                template_folder='../templates',
                static_folder='../static')
    
    # Configure app
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
    app.config['NEO4J_URI'] = os.getenv('NEO4J_URI')
    app.config['NEO4J_USERNAME'] = os.getenv('NEO4J_USERNAME')
    app.config['NEO4J_PASSWORD'] = os.getenv('NEO4J_PASSWORD')
    app.config['WTF_CSRF_ENABLED'] = True
    
    # Initialize extensions with app
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    # User loader for Flask-Login
    from app.models import User
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.get_by_id(user_id)
    
    # Register blueprints
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    from app.questionnaire import bp as questionnaire_bp
    app.register_blueprint(questionnaire_bp, url_prefix='/questionnaire')
    
    from app.matches import bp as matches_bp
    app.register_blueprint(matches_bp, url_prefix='/matches')
    
    # Main routes
    from app.main import bp as main_bp
    app.register_blueprint(main_bp)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        from flask import render_template
        return render_template('404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        from flask import render_template
        return render_template('500.html'), 500
    
    # Context processors (variables available in all templates)
    @app.context_processor
    def inject_globals():
        return {
            'app_name': 'MySoulMate',
            'app_version': '1.0.0'
        }
    
    # Add JSON filter for templates
    import json
    
    @app.template_filter('tojsonfilter')
    def to_json_filter(obj):
        return json.dumps(obj)
    
    return app