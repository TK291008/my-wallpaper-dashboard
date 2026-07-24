import hashlib
import json
import os
import sqlite3
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(__file__), "wallpapers.db")
JSON_OUTPUT = os.path.join(os.path.dirname(__file__), "..", "wallpapers.json")


def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def create_tables():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.executescript(
        """
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
        );

        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            is_verified INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_activity (
            activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            wallpaper_id INTEGER NOT NULL,
            action_type TEXT NOT NULL CHECK(action_type IN ('liked', 'installed', 'viewed')),
            timestamp TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY(wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
        );
        """
    )
    conn.commit()
    conn.close()


def seed_initial_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.executescript(
        """
        DELETE FROM user_activity;
        DELETE FROM users;
        DELETE FROM wallpapers;
        DELETE FROM sqlite_sequence WHERE name IN ('wallpapers', 'users', 'user_activity');
        """
    )

    timestamp = datetime.utcnow().replace(microsecond=0).isoformat()

    wallpapers = [
        {
            "title": "Cursor Halo",
            "type": "cursor",
            "category": "cursor",
            "author": "Tharun",
            "preview": "templates/cursor-trail/index.html",
            "download": "downloads/cursor_trail_lively.zip",
            "appLink": "my-wallpaper-app://open?id=3",
        },
        {
            "title": "Digital Clock",
            "type": "live",
            "category": "live",
            "author": "Tharun",
            "preview": "templates/digital-clock/index.html",
            "download": "downloads/digital_clock.zip",
            "appLink": "my-wallpaper-app://open?id=4",
        },
        {
            "title": "Neon Pulse",
            "type": "solid",
            "category": "solid",
            "author": "Alex",
            "preview": "templates/neon-pulse/index.html",
            "download": "downloads/neon_pulse.zip",
            "appLink": "my-wallpaper-app://open?id=5",
        },
    ]

    wallpaper_ids = []
    for wallpaper in wallpapers:
        cursor.execute(
            """
            INSERT INTO wallpapers (title, type, category, author, preview, download, appLink)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                wallpaper["title"],
                wallpaper["type"],
                wallpaper["category"],
                wallpaper["author"],
                wallpaper["preview"],
                wallpaper["download"],
                wallpaper["appLink"],
            ),
        )
        wallpaper_ids.append(cursor.lastrowid)

    users = [
        ("Tharun", "tharun@example.com", hash_password("Tharun@123"), 1, timestamp),
        ("Alex", "alex@example.com", hash_password("Alex@123"), 1, timestamp),
    ]

    user_ids = []
    for username, email, password_hash, is_verified, created_at in users:
        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, is_verified, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (username, email, password_hash, is_verified, created_at),
        )
        user_ids.append(cursor.lastrowid)

    activity_rows = [
        (user_ids[0], wallpaper_ids[0], "liked", timestamp),
        (user_ids[0], wallpaper_ids[1], "viewed", timestamp),
        (user_ids[1], wallpaper_ids[0], "installed", timestamp),
        (user_ids[1], wallpaper_ids[2], "viewed", timestamp),
        (user_ids[0], wallpaper_ids[2], "liked", timestamp),
    ]
    for user_id, wallpaper_id, action_type, created_at in activity_rows:
        cursor.execute(
            """
            INSERT INTO user_activity (user_id, wallpaper_id, action_type, timestamp)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, wallpaper_id, action_type, created_at),
        )

    conn.commit()
    conn.close()
    print("✅ Seeded wallpapers, users, and activity logs")


def export_wallpapers_json():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            w.id,
            w.title,
            w.type,
            w.category,
            w.author,
            w.preview,
            w.download,
            w.appLink,
            SUM(CASE WHEN ua.action_type = 'liked' THEN 1 ELSE 0 END) AS likes,
            SUM(CASE WHEN ua.action_type = 'installed' THEN 1 ELSE 0 END) AS installs,
            SUM(CASE WHEN ua.action_type = 'viewed' THEN 1 ELSE 0 END) AS views
        FROM wallpapers AS w
        LEFT JOIN user_activity AS ua ON ua.wallpaper_id = w.id
        WHERE w.is_active = 1
        GROUP BY w.id, w.title, w.type, w.category, w.author, w.preview, w.download, w.appLink
        ORDER BY w.id
        """
    )

    wallpapers = []
    for row in cursor.fetchall():
        wallpapers.append(
            {
                "id": row["id"],
                "title": row["title"],
                "type": row["type"],
                "category": row["category"],
                "author": row["author"],
                "preview": row["preview"],
                "download": row["download"],
                "appLink": row["appLink"],
                "likes": int(row["likes"] or 0),
                "installs": int(row["installs"] or 0),
                "views": int(row["views"] or 0),
            }
        )

    conn.close()

    with open(JSON_OUTPUT, "w", encoding="utf-8") as handle:
        json.dump(wallpapers, handle, indent=2)

    print(f"🚀 Exported {len(wallpapers)} wallpapers to wallpapers.json")


if __name__ == "__main__":
    create_tables()
    seed_initial_data()
    export_wallpapers_json()