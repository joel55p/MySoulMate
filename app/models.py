# app/models.py - MySoulMate Data Models and Neo4j Connection
import os
import bcrypt
import jwt
from datetime import datetime, timezone
from neo4j import GraphDatabase
from flask_login import UserMixin
from flask import current_app

class Neo4jConnection:
    """Neo4j database connection manager"""
    
    _driver = None
    
    @classmethod
    def get_driver(cls):
        if cls._driver is None:
            cls._driver = GraphDatabase.driver(
                current_app.config['NEO4J_URI'],
                auth=(
                    current_app.config['NEO4J_USERNAME'],
                    current_app.config['NEO4J_PASSWORD']
                )
            )
        return cls._driver
    
    @classmethod
    def close_driver(cls):
        if cls._driver:
            cls._driver.close()
            cls._driver = None

class User(UserMixin):
    """User model for MySoulMate"""
    
    def __init__(self, user_id, name, email, age, description, profile_complete=False, show_photo=False):
        self.id = user_id
        self.name = name
        self.email = email
        self.age = age
        self.description = description
        self.profile_complete = profile_complete
        self.show_photo = show_photo
    
    @staticmethod
    def create_user(name, email, password, age, description):
        """Create a new user in the database"""
        driver = Neo4jConnection.get_driver()
        
        # Validate university email
        university_domains = [
            'uvg.edu.gt', 'usac.edu.gt', 'url.edu.gt', 
            'unis.edu.gt', 'ufm.edu', 'estudiante.uvg.edu.gt'
        ]
        
        if not any(email.endswith(domain) for domain in university_domains):
            raise ValueError("Must use a university email address")
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        with driver.session() as session:
            # Check if user already exists
            result = session.run(
                "MATCH (u:User {email: $email}) RETURN u",
                email=email
            )
            
            if result.single():
                raise ValueError("User already exists with this email")
            
            # Create new user
            result = session.run(
                """
                CREATE (u:User {
                    id: randomUUID(),
                    name: $name,
                    email: $email,
                    password: $password_hash,
                    age: $age,
                    description: $description,
                    created_at: datetime(),
                    profile_complete: false,
                    show_photo: false
                })
                RETURN u
                """,
                name=name,
                email=email,
                password_hash=password_hash,
                age=age,
                description=description
            )
            
            record = result.single()
            if record:
                user_data = record['u']
                return User(
                    user_data['id'],
                    user_data['name'],
                    user_data['email'],
                    user_data['age'],
                    user_data['description'],
                    user_data['profile_complete'],
                    user_data['show_photo']
                )
    
    @staticmethod
    def authenticate(email, password):
        """Authenticate user with email and password"""
        driver = Neo4jConnection.get_driver()
        
        with driver.session() as session:
            result = session.run(
                "MATCH (u:User {email: $email}) RETURN u",
                email=email
            )
            
            record = result.single()
            if record:
                user_data = record['u']
                
                # Verify password
                if bcrypt.checkpw(password.encode('utf-8'), user_data['password'].encode('utf-8')):
                    return User(
                        user_data['id'],
                        user_data['name'],
                        user_data['email'],
                        user_data['age'],
                        user_data['description'],
                        user_data['profile_complete'],
                        user_data['show_photo']
                    )
        
        return None
    
    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        driver = Neo4jConnection.get_driver()
        
        with driver.session() as session:
            result = session.run(
                "MATCH (u:User {id: $user_id}) RETURN u",
                user_id=user_id
            )
            
            record = result.single()
            if record:
                user_data = record['u']
                return User(
                    user_data['id'],
                    user_data['name'],
                    user_data['email'],
                    user_data['age'],
                    user_data['description'],
                    user_data['profile_complete'],
                    user_data['show_photo']
                )
        
        return None
    
    def save_questionnaire_answers(self, answers):
        """Save user's questionnaire answers"""
        driver = Neo4jConnection.get_driver()
        
        with driver.session() as session:
            # Begin transaction
            with session.begin_transaction() as tx:
                # Delete existing LIKES relationships
                tx.run(
                    "MATCH (u:User {id: $user_id})-[r:LIKES]-() DELETE r",
                    user_id=self.id
                )
                
                # Create new LIKES relationships
                for category, selected_items in answers.items():
                    if isinstance(selected_items, list):
                        # Multiple selections (music, entertainment, sports, hobbies)
                        for item in selected_items:
                            tx.run(
                                """
                                MATCH (u:User {id: $user_id})
                                MATCH (n {name: $item_name})
                                CREATE (u)-[:LIKES {intensity: 1.0, category: $category}]->(n)
                                """,
                                user_id=self.id,
                                item_name=item,
                                category=category
                            )
                    else:
                        # Single selection (values, preferences, etc.)
                        tx.run(
                            """
                            MATCH (u:User {id: $user_id})
                            MATCH (n {name: $item_name})
                            CREATE (u)-[:LIKES {intensity: 1.0, category: $category}]->(n)
                            """,
                            user_id=self.id,
                            item_name=selected_items,
                            category=category
                        )
                
                # Mark profile as complete
                tx.run(
                    "MATCH (u:User {id: $user_id}) SET u.profile_complete = true",
                    user_id=self.id
                )
                
                # Commit transaction
                tx.commit()
        
        self.profile_complete = True
    
    def get_recommendations(self):
        """Get user recommendations based on shared interests"""
        driver = Neo4jConnection.get_driver()
        
        with driver.session() as session:
            result = session.run(
                """
                MATCH (currentUser:User {id: $user_id})-[:LIKES]->(interest)
                MATCH (otherUser:User)-[:LIKES]->(interest)
                WHERE currentUser <> otherUser 
                  AND NOT EXISTS((currentUser)-[:VIEWED]->(otherUser))
                  AND otherUser.profile_complete = true
                WITH otherUser, count(DISTINCT interest) as sharedInterests, 
                     collect(DISTINCT interest.name) as commonInterests
                WHERE sharedInterests >= 2
                
                // Calculate compatibility score
                MATCH (currentUser:User {id: $user_id})-[:LIKES]->(currentInterest)
                MATCH (otherUser)-[:LIKES]->(otherInterest)
                OPTIONAL MATCH (currentInterest)-[:COMPATIBLE_WITH]-(otherInterest)
                WITH otherUser, sharedInterests, commonInterests,
                     sum(CASE WHEN currentInterest = otherInterest THEN 1.0 
                             WHEN EXISTS((currentInterest)-[:COMPATIBLE_WITH]-(otherInterest)) THEN 0.7 
                             ELSE 0 END) as compatibilityScore
                
                RETURN otherUser {
                  .id, .name, .age, .description, .show_photo
                } as user,
                sharedInterests,
                commonInterests,
                compatibilityScore,
                toInteger((compatibilityScore / 10.0) * 100) as matchPercentage
                ORDER BY compatibilityScore DESC, sharedInterests DESC
                LIMIT 10
                """,
                user_id=self.id
            )
            
            recommendations = []
            for record in result:
                recommendations.append({
                    'user': dict(record['user']),
                    'shared_interests': record['sharedInterests'],
                    'common_interests': record['commonInterests'],
                    'match_percentage': record['matchPercentage']
                })
            
            return recommendations
    
    def like_user(self, target_user_id):
        """Like another user and check for match"""
        driver = Neo4jConnection.get_driver()
        
        with driver.session() as session:
            # Create LIKED and VIEWED relationships
            session.run(
                """
                MATCH (currentUser:User {id: $current_user_id})
                MATCH (targetUser:User {id: $target_user_id})
                MERGE (currentUser)-[:LIKED]->(targetUser)
                MERGE (currentUser)-[:VIEWED]->(targetUser)
                """,
                current_user_id=self.id,
                target_user_id=target_user_id
            )
            
            # Check for mutual match
            result = session.run(
                """
                MATCH (user1:User {id: $current_user_id})-[:LIKED]->(user2:User {id: $target_user_id})
                MATCH (user2)-[:LIKED]->(user1)
                RETURN user1, user2
                """,
                current_user_id=self.id,
                target_user_id=target_user_id
            )
            
            is_match = len(list(result)) > 0
            
            if is_match:
                # Create MATCH relationship and enable photo visibility
                session.run(
                    """
                    MATCH (user1:User {id: $current_user_id})
                    MATCH (user2:User {id: $target_user_id})
                    MERGE (user1)-[:MATCH]-(user2)
                    SET user1.show_photo = true, user2.show_photo = true
                    """,
                    current_user_id=self.id,
                    target_user_id=target_user_id
                )
            
            return is_match
    
    def get_matches(self):
        """Get user's matches"""
        driver = Neo4jConnection.get_driver()
        
        with driver.session() as session:
            result = session.run(
                """
                MATCH (currentUser:User {id: $user_id})-[:MATCH]-(matchedUser:User)
                RETURN matchedUser {
                  .id, .name, .age, .description, .show_photo
                } as user
                ORDER BY matchedUser.name
                """,
                user_id=self.id
            )
            
            matches = []
            for record in result:
                matches.append(dict(record['user']))
            
            return matches

class QuestionnaireOptions:
    """Get questionnaire options from database"""
    
    @staticmethod
    def get_all_options():
        """Get all questionnaire options organized by category"""
        driver = Neo4jConnection.get_driver()
        
        try:
            with driver.session() as session:
                # Try a simple query first to test connection
                test_result = session.run("MATCH (m:MusicGenre) RETURN count(m) as count")
                test_record = test_result.single()
                print(f"Music genres found: {test_record['count']}")
                
                # If that works, try the full query
                result = session.run(
                    """
                    MATCH (m:MusicGenre) RETURN 'music' as category, collect({name: m.name, id: m.name}) as options
                    UNION
                    MATCH (e:Entertainment) RETURN 'entertainment' as category, collect({name: e.name, id: e.name}) as options
                    UNION
                    MATCH (s:Sport) RETURN 'sports' as category, collect({name: s.name, id: s.name}) as options
                    UNION
                    MATCH (h:Hobby) RETURN 'hobbies' as category, collect({name: h.name, id: h.name}) as options
                    UNION
                    MATCH (rv:RelationshipValue) RETURN 'relationship_values' as category, collect({name: rv.name, id: rv.name}) as options
                    UNION
                    MATCH (wp:WeekendPreference) RETURN 'weekend_preferences' as category, collect({name: wp.name, id: wp.name}) as options
                    UNION
                    MATCH (ct:ConversationType) RETURN 'conversation_types' as category, collect({name: ct.name, id: ct.name}) as options
                    UNION
                    MATCH (ss:SocialStyle) RETURN 'social_style' as category, collect({name: ss.name, id: ss.name}) as options
                    UNION
                    MATCH (rt:RelationshipType) RETURN 'relationship_type' as category, collect({name: rt.name, id: rt.name}) as options
                    """
                )
                
                questionnaire = {}
                for record in result:
                    category = record['category']
                    options = record['options']
                    questionnaire[category] = options
                    print(f"Loaded {category}: {len(options)} options")
                
                print(f"Total categories loaded: {len(questionnaire)}")
                return questionnaire
                
        except Exception as e:
            print(f"Error in get_all_options: {e}")
            import traceback
            traceback.print_exc()
            raise e