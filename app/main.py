# app/main.py - Main Blueprint
from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user

# Create blueprint
bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """Homepage route"""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('index.html')

@bp.route('/dashboard')
@login_required
def dashboard():
    """User dashboard route"""
    return render_template('dashboard.html', user=current_user)

@bp.route('/profile')
@login_required
def profile():
    """User profile route"""
    return render_template('profile.html', user=current_user)