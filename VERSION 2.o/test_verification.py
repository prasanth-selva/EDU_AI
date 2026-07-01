#!/usr/bin/env python3
"""
Automated verification test for Edu Mentor AI Version 2.0
Tests the full flow: register → login → dashboard → quiz → progress
"""
import requests, json, sys, time

BASE = "http://localhost:8111"
PASS = "✅"
FAIL = "❌"

results = []

def test(name, fn):
    try:
        fn()
        print(f"  {PASS} {name}")
        results.append((name, True, None))
    except Exception as e:
        print(f"  {FAIL} {name}: {e}")
        results.append((name, False, str(e)))

def assert_eq(val, expected, msg=""):
    if val != expected:
        raise AssertionError(f"{msg} — expected {expected!r}, got {val!r}")

def assert_in(val, collection, msg=""):
    if val not in collection:
        raise AssertionError(f"{msg} — {val!r} not in {collection!r}")

def assert_key(d, key):
    if key not in d:
        raise AssertionError(f"Missing key '{key}' in response: {d}")

# ── Helpers ───────────────────────────────────────────────────────────────────
def post(path, body):
    r = requests.post(f"{BASE}{path}", json=body, timeout=30)
    if not r.ok:
        raise AssertionError(f"HTTP {r.status_code}: {r.text[:200]}")
    return r.json()

def get(path):
    r = requests.get(f"{BASE}{path}", timeout=30)
    if not r.ok:
        raise AssertionError(f"HTTP {r.status_code}: {r.text[:200]}")
    return r.json()

# ── Run Tests ─────────────────────────────────────────────────────────────────
print("\n══════════════════════════════════════════════")
print("  Edu Mentor AI v2.0 — Automated Test Suite")
print("══════════════════════════════════════════════\n")

# 1. Health
test("Health check", lambda: assert_key(get("/api/health"), "status"))

# 2. Student Registration
import hashlib, random, string
rand_user = "testuser_" + "".join(random.choices(string.ascii_lowercase, k=6))
student_id = None

def reg():
    global student_id
    data = post("/api/student/register", {
        "username": rand_user,
        "name": "Test Student",
        "password": "testpass123",
        "grade": "8"
    })
    assert_key(data, "student_id")
    assert_key(data, "grade")
    assert_eq(str(data["grade"]), "8", "grade mismatch")
    student_id = data["student_id"]

test("Student Registration", reg)

# 3. Duplicate registration should fail
def dup_reg():
    try:
        post("/api/student/register", {"username": rand_user, "name": "X", "password": "x", "grade": "1"})
        raise AssertionError("Should have failed with 400")
    except AssertionError as e:
        if "Should have failed" in str(e):
            raise
        pass  # Expected failure

test("Duplicate Registration Rejected", dup_reg)

# 4. Student Login
def login():
    global student_id
    data = post("/api/student/login", {"username": rand_user, "password": "testpass123"})
    assert_key(data, "student_id")
    assert_key(data, "grade")
    assert_eq(str(data["grade"]), "8", "grade mismatch after login")
    student_id = data["student_id"]

test("Student Login", login)

# 5. Wrong password
def wrong_pass():
    try:
        post("/api/student/login", {"username": rand_user, "password": "wrongpass"})
        raise AssertionError("Should have failed")
    except AssertionError as e:
        if "Should have failed" in str(e):
            raise
        pass

test("Wrong Password Rejected", wrong_pass)

# 6. Teacher Login
def teacher_login():
    data = post("/api/teacher/login", {"username": "admin", "password": "admin123"})
    assert_key(data, "success")

test("Teacher Login", teacher_login)

# 7. Subjects endpoint
def subj_endpoint():
    data = get("/api/subjects")
    assert_key(data, "subjects")
    assert len(data["subjects"]) > 0, "No subjects returned"

test("Subjects Endpoint", subj_endpoint)

# 8. Progress endpoint (should return empty for new student)
def prog_endpoint():
    data = get(f"/api/progress/{student_id}")
    assert_key(data, "progress")
    assert_key(data, "total_quizzes")
    assert_key(data, "avg_score")
    assert_eq(data["total_quizzes"], 0, "New student should have 0 quizzes")

test("Progress Endpoint (new student)", prog_endpoint)

# 9. Submit quiz attempt
def submit_quiz():
    data = post("/api/quiz/submit", {
        "student_id": student_id,
        "subject": "Mathematics",
        "score": 80.0,
        "total_questions": 5,
        "correct_answers": 4
    })
    assert_key(data, "message")

test("Submit Quiz Attempt", submit_quiz)

# 10. Progress endpoint after quiz
def prog_after_quiz():
    data = get(f"/api/progress/{student_id}")
    assert_eq(data["total_quizzes"], 1, "Should have 1 quiz")
    assert_eq(data["avg_score"], 80.0, "Avg score should be 80.0")

test("Progress After Quiz", prog_after_quiz)

# 11. Chat history endpoint
def chat_history():
    data = get(f"/api/chat_history/{student_id}")
    assert_key(data, "history")

test("Chat History Endpoint", chat_history)

# 12. Documents endpoint
def docs_endpoint():
    data = get("/api/documents")
    assert_key(data, "documents")

test("Documents Endpoint", docs_endpoint)

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n══════════════════════════════════════════════")
passed = sum(1 for _, ok, _ in results if ok)
failed = sum(1 for _, ok, _ in results if not ok)
print(f"  Results: {passed}/{len(results)} passed, {failed} failed")
if failed > 0:
    print("\n  Failed tests:")
    for name, ok, err in results:
        if not ok:
            print(f"    {FAIL} {name}: {err}")
print("══════════════════════════════════════════════\n")

sys.exit(0 if failed == 0 else 1)
