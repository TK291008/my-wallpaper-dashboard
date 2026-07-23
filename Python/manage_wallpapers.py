import sqlite3
import json
import os

DB_FILE = os.path.join(os.path.dirname(__file__), 'wallpapers.db')
JSON_OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'wallpapers.json')

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def setup_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wallpapers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            author TEXT NOT NULL,
            preview TEXT NOT NULL,
            download TEXT NOT NULL,
            appLink TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        )
    ''')
    conn.commit()
    conn.close()

def add_wallpaper(title, type_name, category, author, preview, download, app_link):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO wallpapers (title, type, category, author, preview, download, appLink)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (title, type_name, category, author, preview, download, app_link))
    conn.commit()
    conn.close()
    print(f"✅ Added '{title}' to SQL database!")

def generate_website_json():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, type, category, author, preview, download, appLink FROM wallpapers WHERE is_active = 1')
    rows = cursor.fetchall()
    
    wallpapers = []
    for row in rows:
        wallpapers.append({
            "id": row["id"],
            "title": row["title"],
            "type": row["type"],
            "category": row["category"],
            "author": row["author"],
            "preview": row["preview"],
            "download": row["download"],
            "appLink": row["appLink"]
        })
    conn.close()

    with open(JSON_OUTPUT, 'w') as f:
        json.dump(wallpapers, f, indent=4)
        
    print(f"🚀 Exported {len(wallpapers)} wallpapers to 'wallpapers.json'!")

if __name__ == "__main__":
    setup_database()
    
    # Re-seed with full wallpaper structure
    conn = get_db_connection()
    conn.execute('DELETE FROM wallpapers') # Reset table for fresh schema
    conn.commit()
    conn.close()
    
    add_wallpaper("Cursor Halo", "cursor", "Cursor Following", "Tharun", "templates/cursor-trail/index.html", "downloads/cursor_trail_lively.zip", "my-wallpaper-app://open?id=3")
    add_wallpaper("Digital Clock", "live", "Live Engine", "Tharun", "templates/digital-clock/index.html", "downloads/digital_clock.zip", "my-wallpaper-app://open?id=4")
    
    generate_website_json()