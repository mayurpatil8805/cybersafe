
from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from pathlib import Path
import sqlite3
import os
import json
import re

# =====================================
# CYBERSAFE - FLASK BACKEND
# =====================================

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
DATABASE = BASE_DIR / "cybersafe.db"

app = Flask(__name__, static_folder=None)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "change-this-secret-key-before-deployment"
)

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax"
)


# =====================================
# DATABASE CONNECTION
# =====================================

def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    db = get_db()

    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            data_json TEXT NOT NULL DEFAULT '{}',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS quiz_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            total INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    """)

    # Existing database मध्ये role column नसेल तर add करणे
    columns = [
        row["name"]
        for row in db.execute("PRAGMA table_info(users)").fetchall()
    ]

    if "role" not in columns:
        db.execute(
            "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"
        )

    # Environment variables मधून admin account तयार करणे
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")

    if admin_email and admin_password:
        existing = db.execute(
            "SELECT id FROM users WHERE email = ?",
            (admin_email,)
        ).fetchone()

        if not existing:
            db.execute("""
                INSERT INTO users (name, email, password, role)
                VALUES (?, ?, ?, 'admin')
            """, (
                "CyberSafe Admin",
                admin_email,
                generate_password_hash(admin_password)
            ))

    db.commit()
    db.close()


# =====================================
# HELPER FUNCTIONS
# =====================================

def get_current_user():
    user_id = session.get("user_id")

    if not user_id:
        return None

    db = get_db()
    user = db.execute(
        "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
        (user_id,)
    ).fetchone()
    db.close()

    return user


def user_data(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "created_at": user["created_at"]
    }


def login_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        if not get_current_user():
            return jsonify({
                "success": False,
                "message": "Please login first."
            }), 401

        return function(*args, **kwargs)

    return wrapper


def admin_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        user = get_current_user()

        if not user:
            return jsonify({
                "success": False,
                "message": "Please login first."
            }), 401

        if user["role"] != "admin":
            return jsonify({
                "success": False,
                "message": "Admin access denied."
            }), 403

        return function(*args, **kwargs)

    return wrapper


# =====================================
# FRONTEND ROUTES
# =====================================

@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def frontend_files(filename):
    file_path = FRONTEND_DIR / filename

    if file_path.is_file():
        return send_from_directory(FRONTEND_DIR, filename)

    return jsonify({"message": "File not found"}), 404


# =====================================
# REGISTER
# =====================================

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({
            "success": False,
            "message": "Enter a valid email address."
        }), 400

    if len(password) < 10 or len(password) > 128:
        return jsonify({
            "success": False,
            "message": "Password must be 10 to 128 characters."
        }), 400

    db = get_db()

    try:
        cursor = db.execute("""
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, 'user')
        """, (
            name,
            email,
            generate_password_hash(password)
        ))

        user_id = cursor.lastrowid

        db.execute("""
            INSERT INTO progress (user_id, data_json)
            VALUES (?, ?)
        """, (user_id, "{}"))

        db.commit()

        session.clear()
        session["user_id"] = user_id

        user = db.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        return jsonify({
            "success": True,
            "message": "Registration successful.",
            "user": user_data(user)
        })

    except sqlite3.IntegrityError:
        return jsonify({
            "success": False,
            "message": "Email already registered."
        }), 409

    finally:
        db.close()


# =====================================
# LOGIN
# =====================================

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    db = get_db()

    user = db.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    db.close()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    session.clear()
    session["user_id"] = user["id"]

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "user": user_data(user)
    })


# =====================================
# CURRENT USER
# =====================================

@app.route("/api/me", methods=["GET"])
def current_user():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "user": None
        }), 401

    return jsonify({
        "success": True,
        "user": user_data(user)
    })


# =====================================
# LOGOUT
# =====================================

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })


# =====================================
# USER PROGRESS
# =====================================


# =====================================
# USER PROGRESS - FIXED VERSION
# =====================================

@app.route("/api/progress", methods=["GET", "POST"])
@login_required
def user_progress():

    user = get_current_user()
    db = get_db()

    try:
        # Check existing database columns
        columns = [
            row["name"]
            for row in db.execute(
                "PRAGMA table_info(progress)"
            ).fetchall()
        ]

        if "user_id" not in columns:
            return jsonify({
                "success": False,
                "message": "Database missing user_id column."
            }), 500

        # Add missing columns safely
        if "data_json" not in columns:
            db.execute(
                "ALTER TABLE progress ADD COLUMN data_json TEXT DEFAULT '{}'"
            )

        if "updated_at" not in columns:
            db.execute(
                "ALTER TABLE progress ADD COLUMN updated_at TIMESTAMP"
            )

        if request.method == "GET":

            row = db.execute(
                "SELECT data_json FROM progress WHERE user_id = ?",
                (user["id"],)
            ).fetchone()

            state = {}

            if row and row["data_json"]:
                try:
                    state = json.loads(row["data_json"])
                except (TypeError, json.JSONDecodeError):
                    state = {}

            return jsonify({
                "success": True,
                "state": state
            })

        # POST - Save progress
        body = request.get_json(silent=True) or {}
        state = body.get("state", {})

        if not isinstance(state, dict):
            return jsonify({
                "success": False,
                "message": "Invalid progress data."
            }), 400

        data_json = json.dumps(state)

        existing = db.execute(
            "SELECT id FROM progress WHERE user_id = ?",
            (user["id"],)
        ).fetchone()

        if existing:
            db.execute("""
                UPDATE progress
                SET data_json = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (data_json, user["id"]))

        else:
            db.execute("""
                INSERT INTO progress (user_id, data_json, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (user["id"], data_json))

        db.commit()

        return jsonify({
            "success": True,
            "message": "Progress saved successfully."
        })

    except Exception as error:

        db.rollback()

        app.logger.exception("Progress save failed")

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:
        db.close()
# =====================================
# QUIZ SCORE
# =====================================

@app.route("/api/quiz", methods=["POST"])
@login_required
def save_quiz():
    data = request.get_json(silent=True) or {}

    try:
        score = int(data.get("score"))
        total = int(data.get("total"))
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid quiz score."
        }), 400

    if total <= 0 or score < 0 or score > total:
        return jsonify({
            "success": False,
            "message": "Invalid score values."
        }), 400

    user = get_current_user()
    db = get_db()

    db.execute("""
        INSERT INTO quiz_scores (user_id, score, total)
        VALUES (?, ?, ?)
    """, (user["id"], score, total))

    db.commit()
    db.close()

    return jsonify({
        "success": True,
        "message": "Quiz score saved."
    })


# =====================================
# QUIZ HISTORY
# =====================================

@app.route("/api/quiz/history", methods=["GET"])
@login_required
def quiz_history():
    user = get_current_user()
    db = get_db()

    rows = db.execute("""
        SELECT id, score, total, created_at
        FROM quiz_scores
        WHERE user_id = ?
        ORDER BY id DESC
    """, (user["id"],)).fetchall()

    db.close()

    return jsonify({
        "success": True,
        "history": [dict(row) for row in rows]
    })


# =====================================
# ADMIN DASHBOARD STATS
# =====================================

@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def admin_stats():
    db = get_db()

    total_users = db.execute(
        "SELECT COUNT(*) FROM users WHERE role = 'user'"
    ).fetchone()[0]

    total_quizzes = db.execute(
        "SELECT COUNT(*) FROM quiz_scores"
    ).fetchone()[0]

    result = db.execute("""
        SELECT
            SUM(score) AS total_score,
            SUM(total) AS total_marks
        FROM quiz_scores
    """).fetchone()

    average_score = 0

    if result["total_marks"]:
        average_score = round(
            (result["total_score"] / result["total_marks"]) * 100,
            2
        )

    recent_users = db.execute("""
        SELECT id, name, email, created_at
        FROM users
        WHERE role = 'user'
        ORDER BY id DESC
        LIMIT 20
    """).fetchall()

    db.close()

    return jsonify({
        "success": True,
        "total_users": total_users,
        "total_quizzes": total_quizzes,
        "average_score": average_score,
        "recent_users": [dict(row) for row in recent_users]
    })


# =====================================
# ADMIN - ALL USERS
# =====================================


# =====================================
# ADMIN - ALL USERS WITH POINTS
# =====================================

@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_users():

    db = get_db()

    try:
        users = db.execute("""
            SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                u.created_at,
                p.data_json
            FROM users u
            LEFT JOIN progress p ON u.id = p.user_id
            WHERE u.role = 'user'
            ORDER BY u.id DESC
        """).fetchall()

        result = []

        for user in users:

            try:
                state = json.loads(user["data_json"] or "{}")

                if not isinstance(state, dict):
                    state = {}

            except (TypeError, json.JSONDecodeError):
                state = {}

            completed = state.get("completed", [])

            if not isinstance(completed, list):
                completed = []

            try:
                points = int(state.get("points", 0))
            except (TypeError, ValueError):
                points = 0

            result.append({
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "created_at": user["created_at"],
                "points": points,
                "completed_lessons": len(completed),
                "completed": completed
            })

        return jsonify({
            "success": True,
            "users": result
        })

    except Exception as error:

        app.logger.exception("Admin users API failed")

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:
        db.close()
# =====================================
# ADMIN - DELETE USER
# =====================================

@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def admin_delete_user(user_id):
    db = get_db()

    user = db.execute(
        "SELECT id, role FROM users WHERE id = ?",
        (user_id,)
    ).fetchone()

    if not user:
        db.close()
        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    if user["role"] == "admin":
        db.close()
        return jsonify({
            "success": False,
            "message": "Admin accounts cannot be deleted here."
        }), 403

    db.execute("DELETE FROM progress WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM quiz_scores WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM users WHERE id = ?", (user_id,))

    db.commit()
    db.close()

    return jsonify({
        "success": True,
        "message": "User deleted successfully."
    })


# =====================================
# ADMIN - VIEW USER PROGRESS
# =====================================


@app.route("/api/admin/users/<int:user_id>/progress", methods=["GET"])
@admin_required
def admin_user_progress(user_id):
    db = get_db()

    try:
        user = db.execute("""
            SELECT id, name, email, created_at
            FROM users
            WHERE id = ? AND role = 'user'
        """, (user_id,)).fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found."
            }), 404

        row = db.execute("""
            SELECT data_json, updated_at
            FROM progress
            WHERE user_id = ?
        """, (user_id,)).fetchone()

        quiz_rows = db.execute("""
            SELECT score, total, created_at
            FROM quiz_scores
            WHERE user_id = ?
            ORDER BY id DESC
        """, (user_id,)).fetchall()

        state = {}

        if row and row["data_json"]:
            try:
                state = json.loads(row["data_json"])
            except (TypeError, json.JSONDecodeError):
                state = {}

        return jsonify({
            "success": True,
            "user": dict(user),
            "progress": state,
            "updated_at": row["updated_at"] if row else None,
            "quiz_history": [dict(item) for item in quiz_rows]
        })

    except Exception as error:
        app.logger.exception("Admin progress API failed")
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:
        db.close()

    db = get_db()

    user = db.execute("""
        SELECT id, name, email, created_at
        FROM users
        WHERE id = ? AND role = 'user'
    """, (user_id,)).fetchone()

    if not user:
        db.close()
        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    row = db.execute(
        "SELECT data_json, updated_at FROM progress WHERE user_id = ?",
        (user_id,)
    ).fetchone()

    quiz_rows = db.execute("""
        SELECT score, total, created_at
        FROM quiz_scores
        WHERE user_id = ?
        ORDER BY id DESC
    """, (user_id,)).fetchall()

    db.close()

    try:
        state = json.loads(row["data_json"]) if row else {}
    except (TypeError, json.JSONDecodeError):
        state = {}

    return jsonify({
        "success": True,
        "user": dict(user),
        "progress": state,
        "updated_at": row["updated_at"] if row else None,
        "quiz_history": [dict(item) for item in quiz_rows]
    })


# =====================================
# ADMIN - VIEW CERTIFICATE ELIGIBILITY
# =====================================

@app.route("/api/admin/users/<int:user_id>/certificate", methods=["GET"])
@admin_required
def admin_user_certificate(user_id):
    db = get_db()

    user = db.execute("""
        SELECT id, name, email
        FROM users
        WHERE id = ? AND role = 'user'
    """, (user_id,)).fetchone()

    if not user:
        db.close()
        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    result = db.execute("""
        SELECT
            COUNT(*) AS quizzes,
            SUM(score) AS total_score,
            SUM(total) AS total_marks
        FROM quiz_scores
        WHERE user_id = ?
    """, (user_id,)).fetchone()

    db.close()

    quizzes = result["quizzes"] or 0
    total_score = result["total_score"] or 0
    total_marks = result["total_marks"] or 0

    percentage = round(
        (total_score / total_marks) * 100, 2
    ) if total_marks else 0

    return jsonify({
        "success": True,
        "user": dict(user),
        "quizzes": quizzes,
        "percentage": percentage,
        "eligible": quizzes >= 1
    })


# =====================================
# START SERVER
# =====================================

if __name__ == "__main__":
    init_db()

    print("----------------------------------")
    print("CyberSafe Backend Started")
    print("Database:", DATABASE)
    print("Website: http://127.0.0.1:5000")
    print("----------------------------------")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
