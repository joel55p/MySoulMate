# app/auth.py - Authentication Blueprint
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from app.models import User

# Create blueprint
bp = Blueprint('auth', __name__)

@bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login route"""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not email or not password:
            flash('Please fill in all fields', 'error')
            return render_template('login.html')
        
        try:
            user = User.authenticate(email, password)
            if user:
                login_user(user, remember=True)
                flash(f'Welcome back, {user.name}!', 'success')
                
                # Redirect to questionnaire if profile incomplete
                if not user.profile_complete:
                    return redirect(url_for('questionnaire.start'))
                
                return redirect(url_for('main.dashboard'))
            else:
                flash('Invalid email or password', 'error')
        
        except Exception as e:
            flash('An error occurred during login', 'error')
            print(f"Login error: {e}")
    
    return render_template('login.html')

@bp.route('/register', methods=['GET', 'POST'])
def register():
    """User registration route"""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        age = request.form.get('age')
        description = request.form.get('description')
        
        # Validation
        if not all([name, email, password, age, description]):
            flash('Please fill in all fields', 'error')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('register.html')
        
        if len(password) < 6:
            flash('Password must be at least 6 characters long', 'error')
            return render_template('register.html')
        
        try:
            age = int(age)
            if age < 18 or age > 99:
                flash('Age must be between 18 and 99', 'error')
                return render_template('register.html')
        except ValueError:
            flash('Please enter a valid age', 'error')
            return render_template('register.html')
        
        try:
            user = User.create_user(name, email, password, age, description)
            login_user(user, remember=True)
            flash(f'Welcome to MySoulMate, {user.name}!', 'success')
            # Redirect directly to questionnaire without checking profile_complete
            return redirect(url_for('questionnaire.start'))
        
        except ValueError as e:
            flash(str(e), 'error')
        except Exception as e:
            flash('An error occurred during registration', 'error')
            print(f"Registration error: {e}")
    
    return render_template('register.html')

@bp.route('/logout')
@login_required
def logout():
    """User logout route"""
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('main.index'))