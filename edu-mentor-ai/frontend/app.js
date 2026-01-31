const API_BASE = "";

const state = {
  studentId: null,
  studentName: "",
  grade: 0,
  language: "ta",
  subject: "",
  lessonId: null,
  lesson: null,
  quizId: null,
  chatHistory: [],
};

const qs = (id) => document.getElementById(id);

function showMessage(role, text) {
  const box = qs("chatMessages");
  const row = document.createElement("div");
  row.className = `message ${role}`;
  row.textContent = text;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

function saveState() {
  localStorage.setItem("eduMentorState", JSON.stringify({
    studentId: state.studentId,
    studentName: state.studentName,
    grade: state.grade,
    language: state.language,
  }));
}

function loadState() {
  const saved = localStorage.getItem("eduMentorState");
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    state.studentId = data.studentId || null;
    state.studentName = data.studentName || "";
    state.grade = data.grade ?? 0;
    state.language = data.language || "ta";

    qs("studentName").value = state.studentName;
    qs("gradeSelect").value = String(state.grade);
    qs("langSelect").value = state.language;
  } catch (err) {
    console.warn("state load failed", err);
  }
}

async function createStudent() {
  const name = qs("studentName").value.trim();
  const grade = Number(qs("gradeSelect").value);
  const language = qs("langSelect").value;
  if (!name) {
    alert("பெயரை உள்ளிடவும்");
    return;
  }

  const resp = await fetch(`${API_BASE}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, grade, language }),
  });
  const data = await resp.json();
  state.studentId = data.id || null;
  state.studentName = data.name || name;
  state.grade = grade;
  state.language = language;
  saveState();
  showMessage("assistant", "வணக்கம்! நான் உங்களுக்கு உதவ தயாராக இருக்கிறேன்.");
}

async function loadLessons() {
  const grade = Number(qs("gradeSelect").value);
  const lang = qs("langSelect").value;
  const subject = qs("subjectSelect").value;
  state.subject = subject;

  const params = new URLSearchParams();
  params.set("grade", grade);
  if (subject) params.set("subject", subject);
  if (lang) params.set("lang", lang);

  const resp = await fetch(`${API_BASE}/content/lessons?${params.toString()}`);
  const lessons = await resp.json();

  const list = qs("lessonList");
  list.innerHTML = "";
  lessons.forEach((lesson) => {
    const li = document.createElement("li");
    li.textContent = `${lesson.title || lesson.subject} (${lesson.grade})`;
    li.dataset.lessonId = lesson.lesson_id;
    li.onclick = () => loadLesson(lesson.lesson_id);
    list.appendChild(li);
  });
}

async function loadLesson(lessonId) {
  const resp = await fetch(`${API_BASE}/content/lesson/${lessonId}`);
  const lesson = await resp.json();
  state.lessonId = lesson.lesson_id;
  state.lesson = lesson;
  qs("lessonContent").textContent = lesson.content || lesson.summary || "";
  qs("aiReply").textContent = "";
}

async function explainLesson() {
  const grade = Number(qs("gradeSelect").value);
  const language = qs("langSelect").value;
  if (!state.lessonId) {
    alert("பாடத்தை தேர்ந்தெடுக்கவும்");
    return;
  }

  const resp = await fetch(`${API_BASE}/ai/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lesson_id: state.lessonId,
      grade,
      language,
      subject: state.lesson?.subject || state.subject || null,
    }),
  });
  const data = await resp.json();
  qs("aiReply").textContent = data.reply || "";
}

async function sendChat() {
  const input = qs("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const grade = Number(qs("gradeSelect").value);
  const language = qs("langSelect").value;
  const subject = qs("subjectSelect").value || state.lesson?.subject || "";

  showMessage("user", message);
  state.chatHistory.push({ role: "user", content: message });
  input.value = "";

  const resp = await fetch(`${API_BASE}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      grade,
      subject,
      language,
      history: state.chatHistory.slice(-6),
    }),
  });
  const data = await resp.json();
  const reply = data.reply || "";
  state.chatHistory.push({ role: "assistant", content: reply });
  showMessage("assistant", reply);
}

async function generateQuiz() {
  const grade = Number(qs("gradeSelect").value);
  const language = qs("langSelect").value;
  const subject = qs("subjectSelect").value || state.lesson?.subject || "maths";
  const difficulty = qs("difficultySelect").value;

  const resp = await fetch(`${API_BASE}/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lesson_id: state.lessonId,
      grade,
      subject,
      difficulty,
      language,
      count: 5,
    }),
  });
  const data = await resp.json();
  state.quizId = data.quiz_id;

  const quizBox = qs("quizBox");
  quizBox.innerHTML = "";
  data.questions.forEach((q, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "quiz-question";
    const title = document.createElement("div");
    title.textContent = `${idx + 1}. ${q.question}`;
    wrapper.appendChild(title);

    if (q.options && q.options.length) {
      q.options.forEach((opt) => {
        const label = document.createElement("label");
        label.className = "option";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `q_${idx}`;
        input.value = opt;
        label.appendChild(input);
        label.appendChild(document.createTextNode(opt));
        wrapper.appendChild(label);
      });
    } else {
      const input = document.createElement("input");
      input.placeholder = "பதில்";
      input.dataset.qIndex = String(idx);
      input.className = "answer-input";
      wrapper.appendChild(input);
    }

    quizBox.appendChild(wrapper);
  });
}

async function submitQuiz() {
  if (!state.quizId || !state.studentId) {
    alert("முதலில் Quiz மற்றும் மாணவர் உருவாக்க வேண்டும்");
    return;
  }
  const answers = [];
  const quizBox = qs("quizBox");
  const questionBlocks = quizBox.querySelectorAll(".quiz-question");
  questionBlocks.forEach((block, idx) => {
    const selected = block.querySelector(`input[type="radio"]:checked`);
    if (selected) {
      answers.push(selected.value);
      return;
    }
    const input = block.querySelector(".answer-input");
    answers.push(input ? input.value.trim() : "");
  });

  const resp = await fetch(`${API_BASE}/quiz/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_id: state.studentId,
      quiz_id: state.quizId,
      answers,
      weak_topics: [],
    }),
  });
  const data = await resp.json();
  qs("quizResult").textContent = `மதிப்பெண்: ${data.score}/${data.total} (Accuracy: ${Math.round(data.accuracy * 100)}%)`;
}

async function loadProgress() {
  if (!state.studentId) {
    alert("மாணவர் உருவாக்க வேண்டும்");
    return;
  }
  const resp = await fetch(`${API_BASE}/students/${state.studentId}/progress`);
  const data = await resp.json();
  qs("progressBox").textContent = `Accuracy: ${data.accuracy}, Weak Topics: ${(data.weak_topics || []).join(", ") || "-"}, Streak: ${data.streak}`;
}

qs("createStudent").addEventListener("click", createStudent);
qs("loadLessons").addEventListener("click", loadLessons);
qs("explainLesson").addEventListener("click", explainLesson);
qs("sendChat").addEventListener("click", sendChat);
qs("chatInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendChat();
  }
});
qs("generateQuiz").addEventListener("click", generateQuiz);
qs("submitQuiz").addEventListener("click", submitQuiz);
qs("loadProgress").addEventListener("click", loadProgress);

loadState();
