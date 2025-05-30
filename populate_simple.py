#!/usr/bin/env python3
"""
Script simplificado para poblar la base de datos Neo4j
Coloca este archivo en la raíz del proyecto, al mismo nivel que run.py
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables
load_dotenv()

def create_data():
    """Create all the questionnaire data in Neo4j"""
    
    # Get credentials from .env file
    uri = os.getenv('NEO4J_URI')
    username = os.getenv('NEO4J_USERNAME') 
    password = os.getenv('NEO4J_PASSWORD')
    
    print(f"Conectando a: {uri}")
    print(f"Usuario: {username}")
    
    try:
        driver = GraphDatabase.driver(uri, auth=(username, password))
        
        with driver.session() as session:
            
            print("🧹 Limpiando datos existentes...")
            session.run("MATCH (n) WHERE NOT n:User DETACH DELETE n")
            
            print("🎵 Creando géneros musicales...")
            music_data = [
                "Rock", "Pop", "Hip Hop", "Reggaeton", "Salsa", "Bachata",
                "Jazz", "Blues", "Electronic", "Classical", "Indie", "Alternative"
            ]
            for genre in music_data:
                session.run("CREATE (:MusicGenre {name: $name})", name=genre)
            
            print("🎬 Creando entretenimiento...")
            entertainment_data = [
                "Acción", "Comedia", "Drama", "Romance", "Terror", "Ciencia Ficción",
                "Documentales", "Series de TV", "Anime", "Películas Clásicas"
            ]
            for item in entertainment_data:
                session.run("CREATE (:Entertainment {name: $name})", name=item)
            
            print("🏃‍♂️ Creando deportes...")
            sports_data = [
                "Fútbol", "Básquetbol", "Tenis", "Natación", "Correr", "Ciclismo",
                "Gimnasio", "Yoga", "Volleyball", "Senderismo"
            ]
            for sport in sports_data:
                session.run("CREATE (:Sport {name: $name})", name=sport)
            
            print("🎨 Creando pasatiempos...")
            hobbies_data = [
                "Leer", "Escribir", "Pintar", "Fotografía", "Cocinar", "Viajar",
                "Juegos de Mesa", "Videojuegos", "Música", "Baile"
            ]
            for hobby in hobbies_data:
                session.run("CREATE (:Hobby {name: $name})", name=hobby)
            
            print("💝 Creando valores de relación...")
            values_data = [
                "Honestidad y transparencia",
                "Comunicación abierta", 
                "Respeto mutuo",
                "Apoyo emocional",
                "Diversión y aventura"
            ]
            for value in values_data:
                session.run("CREATE (:RelationshipValue {name: $name})", name=value)
            
            print("🏖️ Creando preferencias de fin de semana...")
            weekend_data = [
                "Salir a explorar nuevos lugares",
                "Relajarme en casa viendo series",
                "Hacer actividades al aire libre",
                "Ir a fiestas o eventos sociales",
                "Pasar tiempo con familia y amigos"
            ]
            for pref in weekend_data:
                session.run("CREATE (:WeekendPreference {name: $name})", name=pref)
            
            print("💬 Creando tipos de conversación...")
            conversation_data = [
                "Conversaciones profundas sobre la vida",
                "Charlas divertidas y llenas de humor",
                "Debates sobre temas actuales",
                "Hablar sobre metas y sueños",
                "Charlas sobre cultura y arte"
            ]
            for conv in conversation_data:
                session.run("CREATE (:ConversationType {name: $name})", name=conv)
            
            print("👥 Creando estilos sociales...")
            social_data = [
                "Muy sociable, me encanta conocer gente nueva",
                "Prefiero grupos pequeños de amigos cercanos", 
                "Me gusta equilibrar tiempo social y personal",
                "Soy más introvertido, prefiero actividades tranquilas",
                "Disfruto tanto de fiestas como de noches tranquilas"
            ]
            for style in social_data:
                session.run("CREATE (:SocialStyle {name: $name})", name=style)
            
            print("❤️ Creando tipos de relación...")
            relationship_data = [
                "Una relación seria y comprometida",
                "Algo casual para empezar",
                "Amistad que pueda evolucionar", 
                "Una conexión profunda y significativa",
                "Compañía para actividades y aventuras"
            ]
            for rel in relationship_data:
                session.run("CREATE (:RelationshipType {name: $name})", name=rel)
            
            print("✅ ¡Datos creados exitosamente!")
            
            # Verificar que se crearon los datos
            result = session.run("MATCH (m:MusicGenre) RETURN count(m) as count")
            count = result.single()['count']
            print(f"📊 Géneros musicales creados: {count}")
            
        driver.close()
        print("🎉 ¡Base de datos lista para usar!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("🔍 Verifica que:")
        print("   - El archivo .env tenga las credenciales correctas")
        print("   - Neo4j esté funcionando")
        print("   - La conexión a internet esté disponible")

if __name__ == "__main__":
    create_data()