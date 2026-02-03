// EDU Mentor AI - Professional Frontend JavaScript
// Enhanced with theme toggle, typing indicator, smooth animations

const API_BASE = "";

// App State
const state = {
  studentId: null,
  studentName: "",
  grade: 5,
  language: "ta",
  subject: "",
  lessonId: null,
  lesson: null,
  quizId: null,
  quiz: [],
  chatHistory: [],
  theme: "dark"
};

// DOM Helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initEventListeners();

  // Auto-register a default student for immediate use
  state.studentId = Date.now();
  state.grade = parseInt($("#gradeSelect")?.value || 5);
  state.language = $("#langSelect")?.value || "ta";

  loadProgress();
});

// ===== THEME MANAGEMENT =====
function initTheme() {
  const savedTheme = localStorage.getItem("eduMentorTheme") || "dark";
  state.theme = savedTheme;
  document.documentElement.setAttribute("data-theme", savedTheme);
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", state.theme);
  localStorage.setItem("eduMentorTheme", state.theme);
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
  // Theme toggle
  $("#themeToggle")?.addEventListener("click", toggleTheme);

  // Start button
  $("#startBtn")?.addEventListener("click", registerStudent);

  // Tab navigation
  $$(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Chat
  $("#sendBtn")?.addEventListener("click", sendChat);
  $("#chatInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendChat();
  });

  // Lessons
  $("#loadLessonsBtn")?.addEventListener("click", loadLessons);

  // Quiz
  $("#generateQuizBtn")?.addEventListener("click", generateQuiz);
  $("#submitQuizBtn")?.addEventListener("click", submitQuiz);
}

// ===== TAB NAVIGATION =====
function switchTab(tabName) {
  // Update tab buttons
  $$(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  // Update tab content
  $$(".tab-content").forEach(content => {
    content.classList.remove("active");
  });
  $(`#${tabName}Tab`)?.classList.add("active");

  // Auto-load content based on tab
  if (tabName === "lessons") {
    loadLessons();
  } else if (tabName === "progress") {
    loadProgress();
  }
}

// ===== STUDENT REGISTRATION =====
async function registerStudent() {
  const name = $("#studentName").value.trim() || "மாணவர்";
  const grade = parseInt($("#gradeSelect").value);
  const language = $("#langSelect").value;

  state.studentName = name;
  state.grade = grade;
  state.language = language;

  try {
    const res = await fetch(`${API_BASE}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, grade, language })
    });

    if (res.ok) {
      const data = await res.json();
      state.studentId = data.id;

      // Show welcome message
      addChatMessage("ai", `வணக்கம் ${name}! நான் உங்கள் AI ஆசிரியர். வகுப்பு ${getGradeName(grade)} பாடங்களில் உதவ தயார்! 📚`);

      // Switch to chat
      switchTab("chat");

      updateStatus("Connected", true);
    }
  } catch (err) {
    console.error("Registration failed:", err);
    // Continue offline
    state.studentId = Date.now();
    addChatMessage("ai", `வணக்கம் ${name}! (Offline mode) - எந்த கேள்வியும் கேளுங்கள்!`);
    switchTab("chat");
  }
}

function getGradeName(grade) {
  const names = ["LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
  return names[grade] || grade;
}

// ===== CHAT FUNCTIONALITY =====
async function sendChat() {
  const input = $("#chatInput");
  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  addChatMessage("user", message);

  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        grade: state.grade,
        language: state.language,
        subject: state.subject || "",
        history: state.chatHistory.slice(-6)
      })
    });

    removeTypingIndicator(typingId);

    if (res.ok) {
      const data = await res.json();
      addChatMessage("ai", data.reply || "மன்னிக்கவும், பதில் கிடைக்கவில்லை.");

      // Store history
      state.chatHistory.push({ role: "user", content: message });
      state.chatHistory.push({ role: "assistant", content: data.reply });
    } else {
      addChatMessage("ai", "❌ பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.");
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    addChatMessage("ai", "⚠️ சர்வருடன் இணைக்க முடியவில்லை.");
  }
}

function addChatMessage(role, content) {
  const container = $("#chatMessages");
  const isAI = role === "ai";

  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${isAI ? 'ai' : 'user'}`;
  msgDiv.innerHTML = `
    <div class="message-avatar">${isAI ? '🤖' : '👤'}</div>
    <div class="message-content">
      <p>${content}</p>
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = $("#chatMessages");
  const id = `typing-${Date.now()}`;

  const typingDiv = document.createElement("div");
  typingDiv.id = id;
  typingDiv.className = "message ai";
  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;

  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;

  return id;
}

function removeTypingIndicator(id) {
  document.getElementById(id)?.remove();
}

// ===== LESSONS =====
async function loadLessons() {
  const subject = $("#subjectFilter").value;
  state.subject = subject;

  try {
    const url = `${API_BASE}/content/lessons?grade=${state.grade}&lang=${state.language}${subject ? `&subject=${subject}` : ''}`;
    const res = await fetch(url);

    if (res.ok) {
      const lessons = await res.json();
      renderLessons(lessons);
    }
  } catch (err) {
    console.error("Failed to load lessons:", err);
    $("#lessonsList").innerHTML = `<div class="empty-state small"><p>பாடங்கள் ஏற்ற முடியவில்லை</p></div>`;
  }
}

function renderLessons(lessons) {
  const container = $("#lessonsList");

  if (!lessons.length) {
    container.innerHTML = `<div class="empty-state small"><p>பாடங்கள் இல்லை</p></div>`;
    return;
  }

  container.innerHTML = lessons.map(l => `
    <div class="lesson-item" data-id="${l.lesson_id}">
      <strong>${l.title}</strong>
      <span style="color: var(--text-muted); font-size: 0.8rem;"> - ${l.subject}</span>
    </div>
  `).join("");

  // Add click handlers
  container.querySelectorAll(".lesson-item").forEach(item => {
    item.addEventListener("click", () => loadLesson(item.dataset.id));
  });
}

async function loadLesson(lessonId) {
  try {
    const res = await fetch(`${API_BASE}/content/lesson/${lessonId}`);
    if (res.ok) {
      const lesson = await res.json();
      state.lesson = lesson;
      state.lessonId = lessonId;

      $("#lessonContent").innerHTML = `
        <h3>${lesson.title}</h3>
        <p>${lesson.content || lesson.summary || "பாடம் உள்ளடக்கம்"}</p>
      `;
    }
  } catch (err) {
    console.error("Failed to load lesson:", err);
  }
}

// ===== QUIZ =====
async function generateQuiz() {
  const btn = $("#generateQuizBtn");
  btn.disabled = true;
  btn.innerHTML = "<span>⏳</span> Loading...";

  try {
    const res = await fetch(`${API_BASE}/quiz/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grade: state.grade,
        subject: state.subject || "maths",
        difficulty: "easy",
        language: state.language,
        count: 5
      })
    });

    if (res.ok) {
      const data = await res.json();
      state.quizId = data.quiz_id;
      state.quiz = data.questions || [];
      renderQuiz();

      $("#submitQuizBtn").classList.remove("hidden");
      $("#quizResult").classList.add("hidden");
    }
  } catch (err) {
    console.error("Failed to generate quiz:", err);
    $("#quizContainer").innerHTML = `<div class="empty-state"><p>Quiz உருவாக்க முடியவில்லை</p></div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = "<span>🎲</span> Generate Quiz";
  }
}

function renderQuiz() {
  const container = $("#quizContainer");

  if (!state.quiz.length) {
    container.innerHTML = `<div class="empty-state"><p>கேள்விகள் இல்லை</p></div>`;
    return;
  }

  container.innerHTML = state.quiz.map((q, i) => `
    <div class="quiz-question" data-index="${i}">
      <h4>${i + 1}. ${q.question}</h4>
      ${q.options ? q.options.map((opt, j) => `
        <label class="quiz-option">
          <input type="radio" name="q${i}" value="${opt}">
          <span>${opt}</span>
        </label>
      `).join("") : `
        <input type="text" class="answer-input" placeholder="உங்கள் பதில்...">
      `}
    </div>
  `).join("");
}

async function submitQuiz() {
  const answers = [];

  state.quiz.forEach((q, i) => {
    const container = $(`.quiz-question[data-index="${i}"]`);
    if (q.options) {
      const selected = container.querySelector('input[type="radio"]:checked');
      answers.push(selected ? selected.value : "");
    } else {
      const input = container.querySelector('input[type="text"]');
      answers.push(input ? input.value : "");
    }
  });

  try {
    const res = await fetch(`${API_BASE}/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: state.studentId,
        quiz_id: state.quizId,
        answers,
        weak_topics: []
      })
    });

    if (res.ok) {
      const result = await res.json();
      showQuizResult(result);
      loadProgress();
    }
  } catch (err) {
    console.error("Failed to submit quiz:", err);
  }
}

function showQuizResult(result) {
  const resultDiv = $("#quizResult");
  const score = result.score || 0;
  const total = result.total || state.quiz.length;
  const pct = Math.round((score / total) * 100);

  resultDiv.innerHTML = `
    <h3>${score}/${total}</h3>
    <p>${pct >= 80 ? '🎉 அருமை!' : pct >= 50 ? '👍 நல்லது!' : '💪 மேலும் முயற்சி செய்!'}</p>
  `;
  resultDiv.classList.remove("hidden");
  $("#submitQuizBtn").classList.add("hidden");
}

// ===== PROGRESS =====
async function loadProgress() {
  if (!state.studentId) return;

  try {
    const res = await fetch(`${API_BASE}/students/${state.studentId}/progress`);
    if (res.ok) {
      const data = await res.json();
      updateProgressUI(data);
    }
  } catch (err) {
    // Silent fail
  }
}

function updateProgressUI(data) {
  const quizzes = data.quizzes_taken || 0;
  const avgScore = data.average_score || 0;

  $("#totalQuizzes").textContent = quizzes;
  $("#avgScore").textContent = `${Math.round(avgScore)}%`;
  $("#streak").textContent = data.streak || 0;
}

// ===== STATUS =====
function updateStatus(text, isOnline) {
  const badge = $("#statusBadge");
  if (badge) {
    badge.innerHTML = `
      <span class="status-dot" style="background: ${isOnline ? 'var(--accent-green)' : 'var(--accent-orange)'}"></span>
      <span>${text}</span>
    `;
  }
}
