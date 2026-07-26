import sqlite3
import os

DB_FILE = os.path.join(
    os.path.dirname(__file__),
    "..",
    "Python",
    "wallpapers.db"
)

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Get existing columns
cursor.execute("PRAGMA table_info(wallpapers)")
existing_columns = [row[1] for row in cursor.fetchall()]

columns_to_add = {
    "views": "INTEGER DEFAULT 0",
    "downloads": "INTEGER DEFAULT 0",
    "likes": "INTEGER DEFAULT 0"
}

for column, definition in columns_to_add.items():
    if column not in existing_columns:
        print(f"Adding '{column}'...")
        cursor.execute(
            f"ALTER TABLE wallpapers ADD COLUMN {column} {definition}"
        )
    else:
        print(f"'{column}' already exists.")

conn.commit()
conn.close()

print("Migration completed successfully!")