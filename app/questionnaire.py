# app/questionnaire.py - Questionnaire Blueprint
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.models import QuestionnaireOptions

# Create blueprint
bp = Blueprint('questionnaire', __name__)

@bp.route('/start')
@login_required
def start():
    """Start questionnaire route"""
    try:
        print("Loading questionnaire options...")
        options = QuestionnaireOptions.get_all_options()
        print(f"Successfully loaded {len(options)} categories")
        return render_template('questionnaire.html', options=options)
    except Exception as e:
        print(f"Error loading questionnaire: {e}")
        import traceback
        traceback.print_exc()
        
        # Return a simple error page instead of redirecting
        return f"""
        <html>
        <head><title>Questionnaire Error</title></head>
        <body>
            <h1>Questionnaire Loading Error</h1>
            <p>There was an error loading the questionnaire options.</p>
            <p>Error: {str(e)}</p>
            <a href="/dashboard">Back to Dashboard</a>
        </body>
        </html>
        """, 500

@bp.route('/submit', methods=['POST'])
@login_required
def submit():
    """Submit questionnaire answers"""
    if current_user.profile_complete:
        return jsonify({'error': 'Questionnaire already completed'}), 400
    
    try:
        data = request.get_json()
        answers = data.get('answers', {})
        
        if not answers:
            return jsonify({'error': 'No answers provided'}), 400
        
        # Save answers to database
        current_user.save_questionnaire_answers(answers)
        
        return jsonify({
            'success': True,
            'message': 'Questionnaire completed successfully!',
            'redirect': url_for('main.dashboard')
        })
    
    except Exception as e:
        print(f"Submit questionnaire error: {e}")
        return jsonify({'error': 'Failed to save questionnaire'}), 500

@bp.route('/api/options')
@login_required
def api_options():
    """API endpoint to get questionnaire options"""
    try:
        options = QuestionnaireOptions.get_all_options()
        return jsonify(options)
    except Exception as e:
        print(f"API options error: {e}")
        return jsonify({'error': 'Failed to load options'}), 500