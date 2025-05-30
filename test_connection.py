#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables
load_dotenv()

def test_neo4j_connection():
    print("Testing Neo4j connection...")
    
    # Get credentials
    uri = os.getenv('NEO4J_URI')
    username = os.getenv('NEO4J_USERNAME')
    password = os.getenv('NEO4J_PASSWORD')
    
    print(f"URI: {uri}")
    print(f"Username: {username}")
    print(f"Password: {'*' * len(password) if password else None}")
    
    try:
        # Create driver
        driver = GraphDatabase.driver(uri, auth=(username, password))
        
        # Test connection
        with driver.session() as session:
            # Test basic connection
            result = session.run("RETURN 'Hello Neo4j' as message")
            record = result.single()
            print(f"Connection test: {record['message']}")
            
            # Count music genres
            result = session.run("MATCH (m:MusicGenre) RETURN count(m) as count")
            record = result.single()
            print(f"MusicGenre count: {record['count']}")
            
            # Test the full query
            result = session.run("""
                MATCH (m:MusicGenre) RETURN 'music' as category, collect({name: m.name, id: m.name}) as options
                UNION
                MATCH (e:Entertainment) RETURN 'entertainment' as category, collect({name: e.name, id: e.name}) as options
                LIMIT 2
            """)
            
            print("Query results:")
            for record in result:
                category = record['category']
                options = record['options']
                print(f"  {category}: {len(options)} options")
                if len(options) > 0:
                    print(f"    First option: {options[0]}")
        
        driver.close()
        print("✅ Neo4j connection working!")
        
    except Exception as e:
        print(f"❌ Neo4j connection failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_neo4j_connection()