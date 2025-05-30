# app/questionnaire.py - Questionnaire Blueprint
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user

# Create blueprint
bp = Blueprint('questionnaire', __name__)

def get_static_options():
    """Return static questionnaire options for testing"""
    return {
        'music': [
            {'name': 'Rock', 'id': 'rock'},
            {'name': 'Pop', 'id': 'pop'},
            {'name': 'Jazz', 'id': 'jazz'},
            {'name': 'Classical', 'id': 'classical'},
            {'name': 'Electronic', 'id': 'electronic'},
            {'name': 'Reggaeton', 'id': 'reggaeton'},
            {'name': 'Country', 'id': 'country'},
            {'name': 'R&B', 'id': 'rnb'},
            {'name': 'Metal', 'id': 'metal'}
        ],
        'entertainment': [
            {'name': 'Action Movies', 'id': 'action'},
            {'name': 'Comedy', 'id': 'comedy'},
            {'name': 'Drama', 'id': 'drama'},
            {'name': 'Sci-Fi', 'id': 'scifi'},
            {'name': 'Romance', 'id': 'romance'},
            {'name': 'Documentary', 'id': 'documentary'},
            {'name': 'Anime', 'id': 'anime'},
            {'name': 'Horror', 'id': 'horror'},
            {'name': 'Thriller', 'id': 'thriller'}
        ],
        'sports': [
            {'name': 'Football', 'id': 'football'},
            {'name': 'Basketball', 'id': 'basketball'},
            {'name': 'Tennis', 'id': 'tennis'},
            {'name': 'Swimming', 'id': 'swimming'},
            {'name': 'Running', 'id': 'running'},
            {'name': 'Gym', 'id': 'gym'},
            {'name': 'Yoga', 'id': 'yoga'},
            {'name': 'Cycling', 'id': 'cycling'},
            {'name': 'Volleyball', 'id': 'volleyball'}
        ],
        'hobbies': [
            {'name': 'Reading', 'id': 'reading'},
            {'name': 'Gaming', 'id': 'gaming'},
            {'name': 'Cooking', 'id': 'cooking'},
            {'name': 'Photography', 'id': 'photography'},
            {'name': 'Traveling', 'id': 'traveling'},
            {'name': 'Art', 'id': 'art'},
            {'name': 'Music', 'id': 'music'},
            {'name': 'Dancing', 'id': 'dancing'},
            {'name': 'Writing', 'id': 'writing'}
        ],
        'relationship_values': [
            {'name': 'Trust and Honesty', 'id': 'trust'},
            {'name': 'Communication', 'id': 'communication'},
            {'name': 'Shared Interests', 'id': 'shared_interests'},
            {'name': 'Independence', 'id': 'independence'},
            {'name': 'Emotional Support', 'id': 'emotional_support'}
        ],
        'weekend_preferences': [
            {'name': 'Outdoor Adventures', 'id': 'outdoor'},
            {'name': 'Relaxing at Home', 'id': 'home'},
            {'name': 'Social Events', 'id': 'social'},
            {'name': 'Cultural Activities', 'id': 'cultural'},
            {'name': 'Sports and Exercise', 'id': 'sports'}
        ],
        'conversation_types': [
            {'name': 'Deep Philosophical', 'id': 'philosophical'},
            {'name': 'Light and Fun', 'id': 'fun'},
            {'name': 'Intellectual Debates', 'id': 'intellectual'},
            {'name': 'Emotional Sharing', 'id': 'emotional'},
            {'name': 'Practical Everyday', 'id': 'practical'}
        ],
        'social_style': [
            {'name': 'Very Social Butterfly', 'id': 'very_social'},
            {'name': 'Selective Socializer', 'id': 'selective'},
            {'name': 'Introverted', 'id': 'introverted'},
            {'name': 'Balanced', 'id': 'balanced'}
        ],
        'relationship_type': [
            {'name': 'Serious Long-term', 'id': 'serious'},
            {'name': 'Casual Dating', 'id': 'casual'},
            {'name': 'Friendship First', 'id': 'friendship'},
            {'name': 'Open to Possibilities', 'id': 'open'}
        ]
    }

@bp.route('/start')
@login_required
def start():
    """Start questionnaire route"""
    try:
        # Use static data for now
        options = get_static_options()
        return render_template('questionnaire.html', options=options)
        
    except Exception as e:
        # Log the actual error
        print(f"Error in questionnaire start: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        flash('Error loading questionnaire. Please try again.', 'error')
        return redirect(url_for('main.dashboard'))

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
        options = get_static_options()
        return jsonify(options)
    except Exception as e:
        print(f"API options error: {e}")
        return jsonify({'error': 'Failed to load options'}), 500