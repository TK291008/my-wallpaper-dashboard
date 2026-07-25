import sqlite3
import os

# Points directly to Python/wallpapers.db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "Python", "wallpapers.db")

print(f"Connecting to database at: {DB_FILE}")

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Fix Cursor Halo
cursor.execute("""
    UPDATE wallpapers 
    SET preview = 'templates/cursor-trail/cursor_halo_preview.png',
        download = 'downloads/cursor_trail_lively.zip',
        appLink = 'templates/cursor-trail/index.html'
    WHERE title = 'Cursor Halo'
""")

# Fix Digital Clock
cursor.execute("""
    UPDATE wallpapers 
    SET preview = 'templates/digital-clock/digital_clock_preview.png',
        download = 'downloads/digital_clock.zip',
        appLink = 'templates/digital-clock/index.html'
    WHERE title = 'Digital Clock'
""")

conn.commit()
conn.close()

print("Database updated successfully!")