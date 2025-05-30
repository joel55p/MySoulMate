# app/matches.py - Matches Blueprint
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user

# Create blueprint
bp = Blueprint('matches', __name__)

@bp.route('/')
@login_required
def index():
    """Matches page route"""
    if not current_user.profile_complete:
        flash('Please complete your profile first', 'warning')
        return redirect(url_for('questionnaire.start'))
    
    try:
        recommendations = current_user.get_recommendations()
        return render_template('matches.html', recommendations=recommendations)
    except Exception as e:
        flash('Error loading recommendations', 'error')
        print(f"Matches error: {e}")
        return render_template('matches.html', recommendations=[])

@bp.route('/like', methods=['POST'])
@login_required
def like_user():
    """Like a user"""
    if not current_user.profile_complete:
        return jsonify({'error': 'Profile not complete'}), 400
    
    try:
        data = request.get_json()
        target_user_id = data.get('user_id')
        
        if not target_user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        is_match = current_user.like_user(target_user_id)
        
        return jsonify({
            'success': True,
            'is_match': is_match,
            'message': 'It\'s a match! 🎉' if is_match else 'Like sent!'
        })
    
    except Exception as e:
        print(f"Like user error: {e}")
        return jsonify({'error': 'Failed to like user'}), 500

@bp.route('/my-matches')
@login_required
def my_matches():
    """View user's matches"""
    if not current_user.profile_complete:
        flash('Please complete your profile first', 'warning')
        return redirect(url_for('questionnaire.start'))
    
    try:
        matches = current_user.get_matches()
        return render_template('my_matches.html', matches=matches)
    except Exception as e:
        flash('Error loading matches', 'error')
        print(f"My matches error: {e}")
        return render_template('my_matches.html', matches=[])

@bp.route('/api/recommendations')
@login_required
def api_recommendations():
    """API endpoint to get recommendations"""
    if not current_user.profile_complete:
        return jsonify({'error': 'Profile not complete'}), 400
    
    try:
        recommendations = current_user.get_recommendations()
        return jsonify(recommendations)
    except Exception as e:
        print(f"API recommendations error: {e}")
        return jsonify({'error': 'Failed to load recommendations'}), 500