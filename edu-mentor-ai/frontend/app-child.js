/**
 * EDU MENTOR AI - Child-Friendly PWA Application
 * Offline-First AI Tutor for Tamil Nadu Students (LKG-6th)
 */

const API_BASE = "";

// Application State
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
  isOnline: navigator.onLine,
  progress: {
    lessonsCompleted: 0,
    quizzesCompleted: 0,
    averageScore: 0,
    streakDays: 0,
    lastActivity: null
  }
};

// DOM Elements
const $ = (id) => document.getElementById(id);

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  checkOnlineStatus();
  loadProgress();
});

function initializeApp() {
  loadState();
  updateStatusIndicator();
  showWelcomeMessage();
}

// Event Listeners
function setupEventListeners() {
  // Student Profile
  $('startLearning').addEventListener('click', createStudent);
  
  // Chat
  $('sendChat').addEventListener('click', sendChat);
  $('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
  });
  
  // Quick Questions
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const question = e.target.dataset.question;
      $('chatInput').value = question;
      sendChat();
    });
  });
  
  // Lessons
  $('loadLessons').addEventListener('click', loadLessons);
  $('explainLesson').addEventListener('click', explainLesson);
  
  // Quiz
  $('generateQuiz').addEventListener('click', generateQuiz);
  $('submitQuiz').addEventListener('click', submitQuiz);
  
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });
  
  // Online/Offline Detection
  window.addEventListener('online', () => {
    state.isOnline = true;
    updateStatusIndicator();
    syncOfflineData();
  });
  
  window.addEventListener('offline', () => {
    state.isOnline = false;
    updateStatusIndicator();
  });
}

// Tab Management
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const tabMap = {
    'chat': 'chatTab',
    'lessons': 'lessonsTab',
    'quiz': 'quizTab',
    'progress': 'progressTab'
  };
  
  $(tabMap[tabName]).classList.add('active');
  
  // Load data for specific tabs
  if (tabName === 'progress') {
    loadProgress();
  }
}

// Status Indicator
function updateStatusIndicator() {
  const indicator = $('statusIndicator');
  const dot = indicator.querySelector('.status-dot');
  const text = indicator.querySelector('.status-text');
  
  if (state.isOnline) {
    dot.className = 'status-dot online';
    text.textContent = state.language === 'ta' 
      ? 'இணைக்கப்பட்டுள்ளது • Online' 
      : 'Online';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = state.language === 'ta' 
      ? 'ஆஃப்லைன் • Offline' 
      : 'Offline';
  }
}

function checkOnlineStatus() {
  fetch(`${API_BASE}/health`, { method: 'GET' })
    .then(() => {
      state.isOnline = true;
      updateStatusIndicator();
    })
    .catch(() => {
      state.isOnline = false;
      updateStatusIndicator();
    });
}

// Local Storage Management
function saveState() {
  const stateData = {
    studentId: state.studentId,
    studentName: state.studentName,
    grade: state.grade,
    language: state.language,
    progress: state.progress
  };
  localStorage.setItem('eduMentorState', JSON.stringify(stateData));
}

function loadState() {
  const saved = localStorage.getItem('eduMentorState');
  if (!saved) return;
  
  try {
    const data = JSON.parse(saved);
    state.studentId = data.studentId || null;
    state.studentName = data.studentName || "";
    state.grade = data.grade ?? 0;
    state.language = data.language || "ta";
    state.progress = data.progress || state.progress;
    
    // Populate UI
    $('studentName').value = state.studentName;
    $('gradeSelect').value = String(state.grade);
    $('langSelect').value = state.language;
  } catch (err) {
    console.error('Failed to load state:', err);
  }
}

// Student Management
async function createStudent() {
  const name = $('studentName').value.trim();
  const grade = Number($('gradeSelect').value);
  const language = $('langSelect').value;
  
  if (!name) {
    showAlert(language === 'ta' ? 'பெயரை உள்ளிடவும்' : 'Please enter name');
    return;
  }
  
  state.studentName = name;
  state.grade = grade;
  state.language = language;
  
  showLoading(true);
  
  try {
    const resp = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, grade, language }),
    });
    
    const data = await resp.json();
    state.studentId = data.id || null;
    
    saveState();
    showWelcomeMessage();
    showAlert(language === 'ta' 
      ? `வணக்கம் ${name}! கற்றலை தொடங்குங்கள் 🎉` 
      : `Welcome ${name}! Let's start learning 🎉`
    );
  } catch (err) {
    console.error('Student creation failed:', err);
    // Offline fallback
    state.studentId = `offline_${Date.now()}`;
    saveState();
    showWelcomeMessage();
  } finally {
    showLoading(false);
  }
}

// Chat Functionality
function showWelcomeMessage() {
  if (!state.studentName) return;
  
  const lang = state.language;
  const message = lang === 'ta'
    ? `வணக்கம் ${state.studentName}! நான் உங்கள் AI ஆசிரியர். கேள்விகள் கேளுங்கள்! 😊`
    : `Hello ${state.studentName}! I'm your AI teacher. Ask me questions! 😊`;
  
  addChatMessage('assistant', message, '🤖');
}

async function sendChat() {
  const input = $('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message
  addChatMessage('user', message, '👤');
  state.chatHistory.push({ role: 'user', content: message });
  
  input.value = '';
  
  showLoading(true);
  
  try {
    const resp = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        grade: state.grade,
        language: state.language,
        subject: $('subjectSelect').value || null,
        history: state.chatHistory.slice(-6)
      }),
    });
    
    const data = await resp.json();
    const reply = data.reply || (state.language === 'ta' 
      ? 'மன்னிக்கவும், பதில் தெரியவில்லை.' 
      : 'Sorry, I don\'t know the answer.');
    
    addChatMessage('assistant', reply, '🤖');
    state.chatHistory.push({ role: 'assistant', content: reply });
    
    // Update progress
    state.progress.lastActivity = Date.now();
    saveState();
    
  } catch (err) {
    console.error('Chat error:', err);
    const errorMsg = state.language === 'ta'
      ? 'AI இப்போது கிடைக்கவில்லை. பின்னர் முயற்சி செய்யுங்கள்.'
      : 'AI is not available. Please try again later.';
    addChatMessage('assistant', errorMsg, '⚠️');
  } finally {
    showLoading(false);
  }
}

function addChatMessage(role, content, avatar = '') {
  const container = $('chatMessages');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'message-avatar';
  avatarDiv.textContent = avatar || (role === 'user' ? '👤' : '🤖');
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  // Simple markdown-like formatting
  const formattedContent = content
    .split('\n').map(line => `<p>${line}</p>`).join('');
  contentDiv.innerHTML = formattedContent;
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  container.appendChild(messageDiv);
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// Lessons
async function loadLessons() {
  showLoading(true);
  
  try {
    const params = new URLSearchParams({
      grade: state.grade,
      lang: state.language
    });
    
    const subject = $('subjectSelect').value;
    if (subject) params.set('subject', subject);
    
    const resp = await fetch(`${API_BASE}/content/lessons?${params}`);
    const lessons = await resp.json();
    
    displayLessons(lessons);
  } catch (err) {
    console.error('Load lessons error:', err);
    showAlert(state.language === 'ta' 
      ? 'பாடங்களை ஏற்ற முடியவில்லை' 
      : 'Failed to load lessons'
    );
  } finally {
    showLoading(false);
  }
}

function displayLessons(lessons) {
  const container = $('lessonList');
  container.innerHTML = '';
  
  if (lessons.length === 0) {
    container.innerHTML = '<p class="text-center">No lessons found</p>';
    return;
  }
  
  lessons.forEach(lesson => {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.onclick = () => viewLesson(lesson);
    
    card.innerHTML = `
      <div class="lesson-card-title">${lesson.title || lesson.subject}</div>
      <div class="lesson-card-meta">
        📖 ${getLevelName(lesson.grade)} • ${getSubjectEmoji(lesson.subject)} ${lesson.subject}
      </div>
    `;
    
    container.appendChild(card);
  });
}

function viewLesson(lesson) {
  state.lesson = lesson;
  state.lessonId = lesson.lesson_id;
  
  $('lessonTitle').textContent = lesson.title || lesson.subject;
  $('lessonBody').innerHTML = `
    <div style="padding: 1rem; background: #F9FBE7; border-radius: 12px; margin-bottom: 1rem;">
      <p><strong>📚 சுருக்கம்:</strong> ${lesson.summary || ''}</p>
    </div>
    <div style="line-height: 1.8; font-size: 1.1rem;">
      ${lesson.content ? lesson.content.split('\n').map(p => `<p>${p}</p>`).join('') : ''}
    </div>
  `;
  
  $('lessonContent').classList.remove('hidden');
  $('lessonList').style.display = 'none';
  
  $('closeLesson').onclick = () => {
    $('lessonContent').classList.add('hidden');
    $('lessonList').style.display = 'grid';
  };
}

async function explainLesson() {
  if (!state.lessonId) return;
  
  showLoading(true);
  
  try {
    const resp = await fetch(`${API_BASE}/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_id: state.lessonId,
        grade: state.grade,
        language: state.language,
        subject: state.lesson?.subject || null
      }),
    });
    
    const data = await resp.json();
    $('aiReply').innerHTML = `
      <div class="ai-explanation">
        <h3>🤖 AI விளக்கம்:</h3>
        <div style="background: #E8F5E9; padding: 1.5rem; border-radius: 12px; line-height: 1.8;">
          ${data.reply.split('\n').map(p => `<p>${p}</p>`).join('')}
        </div>
      </div>
    `;
    
    // Update progress
    state.progress.lessonsCompleted++;
    state.progress.lastActivity = Date.now();
    saveState();
    
  } catch (err) {
    console.error('Explain error:', err);
    $('aiReply').textContent = 'AI explanation not available';
  } finally {
    showLoading(false);
  }
}

// Quiz
async function generateQuiz() {
  showLoading(true);
  
  try {
    const resp = await fetch(`${API_BASE}/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: state.studentId,
        grade: state.grade,
        subject: $('subjectSelect').value || null,
        language: state.language,
        difficulty: $('difficultySelect').value,
        count: 5
      }),
    });
    
    const data = await resp.json();
    state.quizId = data.quiz_id;
    
    displayQuiz(data.questions);
  } catch (err) {
    console.error('Quiz generation error:', err);
    showAlert('Quiz generation failed');
  } finally {
    showLoading(false);
  }
}

function displayQuiz(questions) {
  const container = $('quizBox');
  container.innerHTML = '';
  
  questions.forEach((q, index) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question';
    qDiv.style.cssText = 'background: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
    
    qDiv.innerHTML = `
      <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 1rem; color: #4CAF50;">
        ${index + 1}. ${q.question}
      </div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <label style="display: block; padding: 0.75rem; margin: 0.5rem 0; background: #F5F5F5; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
            <input type="radio" name="q${index}" value="${opt}" style="margin-right: 0.5rem; transform: scale(1.3);">
            <span style="font-size: 1.1rem;">${opt}</span>
          </label>
        `).join('')}
      </div>
    `;
    
    container.appendChild(qDiv);
  });
  
  $('quizActions').classList.remove('hidden');
}

async function submitQuiz() {
  // Collect answers
  const questions = $('quizBox').querySelectorAll('.quiz-question');
  const answers = [];
  
  questions.forEach((q, index) => {
    const selected = q.querySelector(`input[name="q${index}"]:checked`);
    answers.push(selected ? selected.value : null);
  });
  
  showLoading(true);
  
  try {
    const resp = await fetch(`${API_BASE}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: state.quizId,
        answers
      }),
    });
    
    const data = await resp.json();
    displayQuizResult(data);
    
    // Update progress
    state.progress.quizzesCompleted++;
    const newAvg = (state.progress.averageScore * (state.progress.quizzesCompleted - 1) + data.score) / state.progress.quizzesCompleted;
    state.progress.averageScore = Math.round(newAvg);
    state.progress.lastActivity = Date.now();
    saveState();
    
  } catch (err) {
    console.error('Submit quiz error:', err);
  } finally {
    showLoading(false);
  }
}

function displayQuizResult(result) {
  const container = $('quizResult');
  const scorePercent = Math.round((result.score / result.total) * 100);
  
  let emoji = '🎉';
  let message = 'சிறப்பு!';
  
  if (scorePercent >= 80) {
    emoji = '🌟';
    message = state.language === 'ta' ? 'மிகச் சிறப்பு!' : 'Excellent!';
  } else if (scorePercent >= 60) {
    emoji = '👍';
    message = state.language === 'ta' ? 'நன்று!' : 'Good!';
  } else {
    emoji = '💪';
    message = state.language === 'ta' ? 'மேலும் முயற்சி செய்!' : 'Keep trying!';
  }
  
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem; background: linear-gradient(135deg, #E8F5E9, #C8E6C9); border-radius: 16px;">
      <div style="font-size: 5rem;">${emoji}</div>
      <h2 style="color: #4CAF50; margin: 1rem 0;">${message}</h2>
      <div style="font-size: 3rem; font-weight: bold; color: #2E7D32;">
        ${result.score} / ${result.total}
      </div>
      <div style="font-size: 1.5rem; margin-top: 0.5rem;">
        ${scorePercent}%
      </div>
    </div>
  `;
}

// Progress
function loadProgress() {
  $('lessonsCompleted').textContent = state.progress.lessonsCompleted;
  $('quizzesCompleted').textContent = state.progress.quizzesCompleted;
  $('averageScore').textContent = state.progress.averageScore + '%';
  $('streakDays').textContent = state.progress.streakDays;
}

// Offline Data Sync
function syncOfflineData() {
  // Future: Sync quiz results to Telegram when online
  console.log('Syncing offline data...');
}

// Utility Functions
function showLoading(show) {
  const overlay = $('loadingOverlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

function showAlert(message) {
  alert(message);
}

function getLevelName(grade) {
  const names = ['LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th'];
  return names[grade] || `Grade ${grade}`;
}

function getSubjectEmoji(subject) {
  const emojis = {
    tamil: '📜',
    english: '🔤',
    maths: '🔢',
    science: '🔬',
    evs: '🌍',
    social: '🏛️',
    computer: '💻'
  };
  return emojis[subject] || '📚';
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { state };
}
