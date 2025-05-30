# run.py - MySoulMate Flask Application Entry Point
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app import create_app

# Create Flask application
app = create_app()

if __name__ == '__main__':
    # Get configuration from environment
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 5000))
    
    print(f"""
    🚀 MySoulMate is starting...
    
    📍 Running on http://{host}:{port}
    🔧 Debug mode: {debug_mode}
    🌍 Environment: {os.getenv('FLASK_ENV', 'production')}
    
    """)
    
    app.run(
        host=host,
        port=port,
        debug=debug_mode
    )