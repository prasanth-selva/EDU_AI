import os
import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
DEFAULT_SUBJECT = os.getenv("DEFAULT_SUBJECT", "maths")

user_state = {}


def get_state(user_id: int) -> dict:
    if user_id not in user_state:
        user_state[user_id] = {
            "grade": 5,
            "language": "ta",
            "subject": DEFAULT_SUBJECT,
            "student_id": None,
            "quiz_id": None,
            "questions": [],
            "answers": [],
            "index": 0,
        }
    return user_state[user_id]


def backend_post(path: str, payload: dict) -> dict:
    url = f"{BACKEND_URL}{path}"
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    state = get_state(update.effective_user.id)
    name = update.effective_user.first_name or "Student"
    await update.message.reply_text(
        "வணக்கம்! EDU Mentor AI Quiz Bot.\n"
        "கிடைக்கும் கட்டளைகள்:\n"
        "/setgrade 5 (0=LKG, 1=UKG, 2=1ம், ... 13=12ம்)\n"
        "/language ta அல்லது en\n"
        "/subject tamil|english|maths|science|social|evs|computer\n"
        "/quiz"
    )

    if state.get("student_id") is None:
        try:
            data = backend_post("/students", {"name": name, "grade": state["grade"], "language": state["language"]})
            state["student_id"] = data.get("id")
        except Exception:
            pass


async def set_grade(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    state = get_state(update.effective_user.id)
    if not context.args:
        await update.message.reply_text("உதா: /setgrade 5")
        return
    try:
        grade = int(context.args[0])
        if grade < 0 or grade > 13:
            raise ValueError
        state["grade"] = grade
        await update.message.reply_text(f"தரம் சேமிக்கப்பட்டது: {grade}")
    except ValueError:
        await update.message.reply_text("0 முதல் 13 வரை எண் கொடுக்கவும்")


async def set_language(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    state = get_state(update.effective_user.id)
    if not context.args:
        await update.message.reply_text("உதா: /language ta")
        return
    lang = context.args[0].strip().lower()
    if lang not in {"ta", "en"}:
        await update.message.reply_text("ta அல்லது en மட்டும்")
        return
    state["language"] = lang
    await update.message.reply_text(f"மொழி சேமிக்கப்பட்டது: {lang}")


async def set_subject(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    state = get_state(update.effective_user.id)
    if not context.args:
        await update.message.reply_text("உதா: /subject maths")
        return
    subject = context.args[0].strip().lower()
    state["subject"] = subject
    await update.message.reply_text(f"பாடம் சேமிக்கப்பட்டது: {subject}")


async def quiz(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    state = get_state(update.effective_user.id)
    try:
        if state.get("student_id") is None:
            name = update.effective_user.first_name or "Student"
            data = backend_post("/students", {"name": name, "grade": state["grade"], "language": state["language"]})
            state["student_id"] = data.get("id")

        data = backend_post(
            "/quiz/generate",
            {
                "grade": state["grade"],
                "subject": state["subject"],
                "difficulty": "easy",
                "language": state["language"],
                "count": 5,
            },
        )
        state["quiz_id"] = data.get("quiz_id")
        state["questions"] = data.get("questions", [])
        state["answers"] = []
        state["index"] = 0
        await send_question(update, state)
    except Exception:
        await update.message.reply_text("Quiz உருவாக்க முடியவில்லை. பின்னர் முயற்சி செய்யவும்.")


async def send_question(update: Update, state: dict) -> None:
    idx = state["index"]
    questions = state.get("questions", [])
    if idx >= len(questions):
        await finish_quiz(update, state)
        return

    q = questions[idx]
    text = f"{idx + 1}. {q.get('question', '')}"
    options = q.get("options", [])
    if options:
        opts = "\n".join([f"{i+1}) {opt}" for i, opt in enumerate(options)])
        text = f"{text}\n{opts}\n(எண் அல்லது பதில் எழுதுங்கள்)"

    await update.message.reply_text(text)


async def handle_answer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    state = get_state(update.effective_user.id)
    if not state.get("questions"):
        return

    idx = state["index"]
    q = state["questions"][idx]
    text = update.message.text.strip()
    options = q.get("options", [])
    answer = text
    if options and text.isdigit():
        choice = int(text)
        if 1 <= choice <= len(options):
            answer = options[choice - 1]

    state["answers"].append(answer)
    state["index"] += 1
    await send_question(update, state)


async def finish_quiz(update: Update, state: dict) -> None:
    try:
        data = backend_post(
            "/quiz/submit",
            {
                "student_id": state["student_id"],
                "quiz_id": state["quiz_id"],
                "answers": state["answers"],
                "weak_topics": [],
            },
        )
        await update.message.reply_text(
            f"முடிந்தது! மதிப்பெண்: {data.get('score')}/{data.get('total')}"
        )
    except Exception:
        await update.message.reply_text("மதிப்பீடு செய்ய முடியவில்லை.")
    finally:
        state["questions"] = []
        state["answers"] = []
        state["index"] = 0


def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN is required")
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("setgrade", set_grade))
    app.add_handler(CommandHandler("language", set_language))
    app.add_handler(CommandHandler("subject", set_subject))
    app.add_handler(CommandHandler("quiz", quiz))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_answer))

    app.run_polling()


if __name__ == "__main__":
    main()
