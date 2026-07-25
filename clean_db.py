import sqlite3
import os

DB_FILE = os.path.join(os.path.dirname(__file__), 'Python', 'wallpapers.db')

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

try:
    # 1. Fetch all rows using SELECT * so it works regardless of column names
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()

    print(f"🔍 Current Users in DB ({len(rows)} total):")
    for row in rows:
        print(row)

    # 2. Wipe all records from the table
    cursor.execute("DELETE FROM users")
    conn.commit()

    print(f"\n✅ Deleted {cursor.rowcount} user(s). The database is now completely clean!")

except sqlite3.OperationalError as e:
    print(f"⚠️ Table error: {e}")

finally:
    conn.close()