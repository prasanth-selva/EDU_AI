/* ============================================================
   EDU MENTOR AI — Complete SPA Script
   All pages, all functionality, real API integration
   ============================================================ */

'use strict';

// ============================================================
// STATE
// ============================================================
const state = {
    currentPage: 'welcome',
    currentUser: null,      // { id, name, grade }
    isTeacher: false,
    quizData: [],
    quizCurrent: 0,
    quizScore: 0,
    quizSubject: '',
    quizTimerInterval: null,
    quizSecondsLeft: 0,
    uploadedFiles: [],
    documents: [],
};

// ============================================================
// API HELPERS
// ============================================================
const BASE = '';   // same-origin when served by FastAPI

async function apiPost(path, body) {
    const res = await fetch(BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server error' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

async function apiGet(path) {
    const res = await fetch(BASE + path);
    if (!res.ok) throw new Error('Request failed');
    return res.json();
}

async function apiUpload(path, formData) {
    const res = await fetch(BASE + path, { method: 'POST', body: formData });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type = 'info') {
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined icon-filled">${icons[type] || 'info'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s cubic-bezier(0.2,0,0,1) forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================================
// MODAL
// ============================================================
function showModal(title, bodyHTML, footerHTML = '') {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'active-modal';
    backdrop.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                <button class="btn-icon" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="modal-body">${bodyHTML}</div>
            ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
        </div>`;
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
    document.body.appendChild(backdrop);
}

function closeModal() {
    const m = document.getElementById('active-modal');
    if (m) m.remove();
}

// ============================================================
// NAVIGATION / ROUTER
// ============================================================
function navigate(page, opts = {}) {
    // Stop quiz timer if leaving quiz
    if (state.quizTimerInterval && page !== 'quiz') {
        clearInterval(state.quizTimerInterval);
        state.quizTimerInterval = null;
    }

    state.currentPage = page;
    const app = document.getElementById('app');
    app.innerHTML = '';

    const pages = {
        welcome: renderWelcome,
        login: renderLogin,
        teacher_login: renderTeacherLogin,
        dashboard: renderDashboard,
        ai_tutor: renderAITutor,
        subjects: renderSubjects,
        quiz: renderQuiz,
        progress: renderProgress,
        teacher_dashboard: renderTeacherDashboard,
    };

    const renderer = pages[page];
    if (renderer) {
        renderer(opts);
    } else {
        app.innerHTML = `<div class="fullpage"><div class="empty-state"><span class="material-symbols-outlined">error_outline</span><h2>Page not found</h2><button class="btn btn-primary" onclick="navigate('welcome')">Go Home</button></div></div>`;
    }

    // Update bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
}

// ============================================================
// SIDEBAR HELPER
// ============================================================
function buildSidebar(activePage, isTeacher = false) {
    const studentLinks = [
        { page: 'dashboard',   icon: 'dashboard',       label: 'Dashboard' },
        { page: 'subjects',    icon: 'auto_stories',    label: 'My Subjects' },
        { page: 'ai_tutor',   icon: 'psychology',      label: 'AI Tutor' },
        { page: 'quiz',        icon: 'assignment',      label: 'Quizzes' },
        { page: 'progress',    icon: 'trending_up',     label: 'Progress' },
    ];
    const teacherLinks = [
        { page: 'teacher_dashboard', icon: 'dashboard',      label: 'Overview' },
    ];
    const links = isTeacher ? teacherLinks : studentLinks;

    const navItems = links.map(l => `
        <button class="nav-item ${activePage === l.page ? 'active' : ''}" onclick="navigate('${l.page}')">
            <span class="material-symbols-outlined">${l.icon}</span>${l.label}
        </button>`).join('');

    const footerBtn = isTeacher
        ? `<button class="btn btn-outlined btn-full" onclick="logout()"><span class="material-symbols-outlined">logout</span>Logout</button>`
        : `<button class="btn btn-primary btn-full" onclick="navigate('ai_tutor')"><span class="material-symbols-outlined">psychology</span>Ask AI Tutor</button>`;

    return `
    <div id="sidebar-overlay" class="sidebar-overlay" onclick="closeSidebar()"></div>
    <nav class="sidebar" id="main-sidebar">
        <div class="sidebar-header">
            <div class="sidebar-logo" onclick="navigate('${isTeacher ? 'teacher_dashboard' : 'dashboard'}')">
                <div class="sidebar-logo-icon"><span class="material-symbols-outlined">school</span></div>
                <div>
                    <div class="sidebar-logo-text">EduMentor</div>
                    <div class="sidebar-logo-sub">${isTeacher ? 'Teacher Panel' : 'Student Portal'}</div>
                </div>
            </div>
        </div>
        <nav class="sidebar-nav">${navItems}</nav>
        <div class="sidebar-footer">${footerBtn}</div>
    </nav>`;
}

function openSidebar() {
    document.getElementById('main-sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('open');
}
function closeSidebar() {
    document.getElementById('main-sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
}

function buildTopbar(title, isTeacher = false) {
    const initial = isTeacher ? 'T' : (state.currentUser?.name?.[0]?.toUpperCase() || 'S');
    return `
    <header class="topbar">
        <div class="flex items-center gap-2">
            <button class="btn-icon" onclick="openSidebar()" aria-label="Open menu" style="display:none" id="menu-toggle">
                <span class="material-symbols-outlined">menu</span>
            </button>
            <span class="topbar-title">${title}</span>
        </div>
        <div class="topbar-actions">
            <button class="btn-icon" aria-label="Notifications"><span class="material-symbols-outlined">notifications</span></button>
            <div class="avatar" title="${state.currentUser?.name || 'User'}">${initial}</div>
        </div>
    </header>
    <script>
        if (window.innerWidth <= 768) document.getElementById('menu-toggle').style.display = 'flex';
        window.addEventListener('resize', () => {
            const t = document.getElementById('menu-toggle');
            if(t) t.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        });
    <\/script>`;
}

function buildBottomNav(active, isTeacher = false) {
    if (isTeacher) return '';
    const items = [
        { page: 'dashboard', icon: 'home',       label: 'Home' },
        { page: 'subjects',  icon: 'auto_stories',label: 'Subjects' },
        { page: 'ai_tutor', icon: 'psychology',  label: 'AI Tutor' },
        { page: 'quiz',      icon: 'assignment',  label: 'Quiz' },
        { page: 'progress',  icon: 'trending_up', label: 'Progress' },
    ];
    return `
    <nav class="bottom-nav">
        <div class="bottom-nav-inner">
            ${items.map(i => `
                <button class="bottom-nav-item ${active === i.page ? 'active' : ''}" data-page="${i.page}" onclick="navigate('${i.page}')">
                    <span class="material-symbols-outlined">${i.icon}</span>${i.label}
                </button>`).join('')}
        </div>
    </nav>`;
}

// ============================================================
// LOGOUT
// ============================================================
function logout() {
    state.currentUser = null;
    state.isTeacher = false;
    showToast('Logged out successfully', 'info');
    navigate('welcome');
}

// ============================================================
// PAGE: WELCOME
// ============================================================
function renderWelcome() {
    document.getElementById('app').innerHTML = `
    <div class="fullpage">
        <div style="text-align:center;max-width:560px;z-index:1;padding:24px;" class="animate-in">
            <div style="width:96px;height:96px;background:var(--primary);border-radius:28px;display:flex;align-items:center;justify-content:center;margin:0 auto 28px;box-shadow:var(--shadow-3);">
                <span class="material-symbols-outlined icon-filled" style="font-size:52px;color:white;">school</span>
            </div>
            <h1 style="font-size:48px;font-weight:800;letter-spacing:-0.03em;margin-bottom:12px;line-height:1.1;">
                Welcome to<br><span style="color:var(--primary);">Edu Mentor AI</span>
            </h1>
            <p style="font-size:18px;color:var(--on-surface-variant);margin-bottom:48px;line-height:1.6;">
                Learn anything, anytime — even without internet.<br>Your personal offline AI tutor.
            </p>
            <div style="display:flex;flex-direction:column;gap:14px;max-width:300px;margin:0 auto;">
                <button class="btn btn-primary btn-lg btn-full animate-in animate-in-delay-1" onclick="navigate('login')">
                    <span class="material-symbols-outlined">face</span>I'm a Student
                </button>
                <button class="btn btn-secondary btn-lg btn-full animate-in animate-in-delay-2" onclick="navigate('teacher_login')">
                    <span class="material-symbols-outlined">school</span>I'm a Teacher
                </button>
            </div>
            <div style="display:flex;gap:24px;justify-content:center;margin-top:48px;flex-wrap:wrap;" class="animate-in animate-in-delay-3">
                <div style="text-align:center;">
                    <div style="font-size:28px;font-weight:800;color:var(--primary);">100%</div>
                    <div style="font-size:13px;color:var(--on-surface-variant);font-weight:500;">Offline</div>
                </div>
                <div style="width:1px;background:var(--outline-variant);"></div>
                <div style="text-align:center;">
                    <div style="font-size:28px;font-weight:800;color:var(--secondary);">AI</div>
                    <div style="font-size:13px;color:var(--on-surface-variant);font-weight:500;">Powered</div>
                </div>
                <div style="width:1px;background:var(--outline-variant);"></div>
                <div style="text-align:center;">
                    <div style="font-size:28px;font-weight:800;color:var(--tertiary);">Free</div>
                    <div style="font-size:13px;color:var(--on-surface-variant);font-weight:500;">Forever</div>
                </div>
            </div>
        </div>
    </div>`;
}

// ============================================================
// PAGE: STUDENT LOGIN
// ============================================================
function renderLogin() {
    document.getElementById('app').innerHTML = `
    <div class="fullpage">
        <div class="auth-card animate-in">
            <div style="text-align:center;margin-bottom:28px;">
                <span class="material-symbols-outlined auth-icon text-primary">face</span>
                <h1 class="text-headline-md" style="margin-bottom:6px;">Student Login</h1>
                <p class="text-body-md text-on-surface-variant">Ready to learn? Let's go!</p>
            </div>
            <form id="login-form" style="display:flex;flex-direction:column;gap:16px;">
                <div class="form-group">
                    <label class="form-label">Your Name</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">person</span>
                        <input type="text" id="student-name" class="input-field" placeholder="Enter your name" required autocomplete="off">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Your Class</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">auto_stories</span>
                        <select id="student-grade" class="input-field" required>
                            <option value="" disabled selected>Select your class</option>
                            <option value="1">Class 1</option>
                            <option value="2">Class 2</option>
                            <option value="3">Class 3</option>
                            <option value="4">Class 4</option>
                            <option value="5">Class 5</option>
                            <option value="6">Class 6</option>
                            <option value="7">Class 7</option>
                            <option value="8">Class 8</option>
                            <option value="9">Class 9</option>
                            <option value="10">Class 10</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary btn-full" style="margin-top:8px;" id="login-btn">
                    Start Learning <span class="material-symbols-outlined">arrow_forward</span>
                </button>
                <button type="button" class="btn btn-ghost btn-full" onclick="navigate('welcome')">← Back</button>
            </form>
        </div>
    </div>`;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('login-btn');
        const name = document.getElementById('student-name').value.trim();
        const grade = document.getElementById('student-grade').value;
        if (!name || !grade) return;
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Registering...';
        try {
            const data = await apiPost('/api/student/register', { name, grade });
            state.currentUser = { id: data.student_id, name: data.name, grade };
            state.isTeacher = false;
            showToast(`Welcome, ${data.name}! 🎉`, 'success');
            navigate('dashboard');
        } catch (err) {
            // Offline fallback — create local session
            state.currentUser = { id: 1, name, grade };
            state.isTeacher = false;
            showToast(`Welcome, ${name}! (Offline mode)`, 'info');
            navigate('dashboard');
        }
    });
}

// ============================================================
// PAGE: TEACHER LOGIN
// ============================================================
function renderTeacherLogin() {
    document.getElementById('app').innerHTML = `
    <div class="fullpage">
        <div class="auth-card animate-in">
            <div style="text-align:center;margin-bottom:28px;">
                <span class="material-symbols-outlined auth-icon text-secondary">school</span>
                <h1 class="text-headline-md" style="margin-bottom:6px;">Teacher Login</h1>
                <p class="text-body-md text-on-surface-variant">Manage your classroom resources.</p>
            </div>
            <form id="teacher-form" style="display:flex;flex-direction:column;gap:16px;">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">person_apron</span>
                        <input type="text" id="teacher-user" class="input-field" placeholder="Enter username" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">lock</span>
                        <input type="password" id="teacher-pass" class="input-field" placeholder="Enter password" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-secondary btn-full" style="margin-top:8px;" id="teacher-btn">
                    Login <span class="material-symbols-outlined">arrow_forward</span>
                </button>
                <button type="button" class="btn btn-ghost btn-full" onclick="navigate('welcome')">← Back</button>
            </form>
            <p style="text-align:center;margin-top:16px;font-size:13px;color:var(--on-surface-variant);">
                Default: <strong>admin</strong> / <strong>admin123</strong>
            </p>
        </div>
    </div>`;

    document.getElementById('teacher-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('teacher-btn');
        const user = document.getElementById('teacher-user').value.trim();
        const pass = document.getElementById('teacher-pass').value;
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Logging in...';
        try {
            const data = await apiPost('/api/teacher/login', { username: user, password: pass });
            state.isTeacher = true;
            state.currentUser = { id: 0, name: 'Teacher' };
            showToast('Welcome back, Teacher! 👋', 'success');
            navigate('teacher_dashboard');
        } catch (err) {
            // simple offline check
            if (user === 'admin' && pass === 'admin123') {
                state.isTeacher = true;
                state.currentUser = { id: 0, name: 'Teacher' };
                showToast('Welcome back, Teacher! (Offline mode)', 'info');
                navigate('teacher_dashboard');
            } else {
                btn.disabled = false;
                btn.innerHTML = 'Login <span class="material-symbols-outlined">arrow_forward</span>';
                showToast('Invalid username or password', 'error');
            }
        }
    });
}

// ============================================================
// PAGE: STUDENT DASHBOARD
// ============================================================
function renderDashboard() {
    if (!state.currentUser) { navigate('login'); return; }
    const name = state.currentUser.name;
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    document.getElementById('app').innerHTML = `
    ${buildSidebar('dashboard')}
    <div class="app-layout">
        <div class="main-area">
            ${buildTopbar('Dashboard')}
            <div class="page-content">
                <!-- Header -->
                <div class="page-header animate-in">
                    <h1>${greet}, ${name} 👋</h1>
                    <p>Here's what's happening with your learning today.</p>
                </div>

                <!-- Quick Stats -->
                <div class="grid grid-4 animate-in animate-in-delay-1" style="margin-bottom:32px;">
                    <div class="stat-card card-primary">
                        <div class="stat-card-header">
                            <span class="text-label-sm text-on-surface-variant">CLASS</span>
                            <div class="stat-card-icon" style="background:rgba(0,74,198,0.1);color:var(--primary);"><span class="material-symbols-outlined">grade</span></div>
                        </div>
                        <div class="stat-card-value text-primary">${state.currentUser.grade}</div>
                        <div class="stat-card-label">My Class</div>
                    </div>
                    <div class="stat-card card-secondary">
                        <div class="stat-card-header">
                            <span class="text-label-sm text-on-surface-variant">STREAK</span>
                            <div class="stat-card-icon" style="background:rgba(0,110,47,0.1);color:var(--secondary);"><span class="material-symbols-outlined">local_fire_department</span></div>
                        </div>
                        <div class="stat-card-value text-secondary">5</div>
                        <div class="stat-card-label">Day Streak 🔥</div>
                    </div>
                    <div class="stat-card card-tertiary">
                        <div class="stat-card-header">
                            <span class="text-label-sm text-on-surface-variant">QUIZZES</span>
                            <div class="stat-card-icon" style="background:rgba(120,75,0,0.1);color:var(--tertiary);"><span class="material-symbols-outlined">assignment_turned_in</span></div>
                        </div>
                        <div class="stat-card-value text-tertiary">12</div>
                        <div class="stat-card-label">Quizzes Done</div>
                    </div>
                    <div class="stat-card" style="border-top-color:var(--error);">
                        <div class="stat-card-header">
                            <span class="text-label-sm text-on-surface-variant">SCORE</span>
                            <div class="stat-card-icon" style="background:rgba(186,26,26,0.1);color:var(--error);"><span class="material-symbols-outlined">emoji_events</span></div>
                        </div>
                        <div class="stat-card-value" style="color:var(--error);">84%</div>
                        <div class="stat-card-label">Avg Score</div>
                    </div>
                </div>

                <!-- Hero Banner + Quick Actions -->
                <div class="grid grid-12 animate-in animate-in-delay-2" style="margin-bottom:32px;">
                    <div class="col-8" style="background:linear-gradient(135deg,var(--primary) 0%,#2563eb 100%);border-radius:var(--r-lg);padding:32px;color:white;position:relative;overflow:hidden;">
                        <span class="material-symbols-outlined icon-filled" style="position:absolute;right:-16px;top:-16px;font-size:160px;opacity:0.08;">psychology</span>
                        <h2 style="font-size:26px;font-weight:800;margin-bottom:10px;">Ask Your AI Tutor</h2>
                        <p style="opacity:0.85;margin-bottom:24px;max-width:360px;">Get instant answers to any question from your uploaded textbooks — 100% offline!</p>
                        <button class="btn" style="background:white;color:var(--primary);font-weight:700;" onclick="navigate('ai_tutor')">
                            <span class="material-symbols-outlined">chat</span>Start Chatting
                        </button>
                    </div>
                    <div class="col-4" style="display:flex;flex-direction:column;gap:16px;">
                        <button class="card card-secondary" style="width:100%;text-align:left;border:none;cursor:pointer;" onclick="navigate('subjects')">
                            <div class="flex items-center gap-2 mb-2">
                                <div class="card-icon" style="background:rgba(0,110,47,0.1);color:var(--secondary);width:40px;height:40px;margin:0;"><span class="material-symbols-outlined">auto_stories</span></div>
                                <span class="text-headline-sm">My Subjects</span>
                            </div>
                            <p class="text-body-md text-on-surface-variant">Continue your lessons</p>
                        </button>
                        <button class="card" style="border-top-color:var(--tertiary);width:100%;text-align:left;border-top:4px solid var(--tertiary);cursor:pointer;" onclick="navigate('quiz')">
                            <div class="flex items-center gap-2 mb-2">
                                <div class="card-icon" style="background:rgba(120,75,0,0.1);color:var(--tertiary);width:40px;height:40px;margin:0;"><span class="material-symbols-outlined">assignment</span></div>
                                <span class="text-headline-sm">Take a Quiz</span>
                            </div>
                            <p class="text-body-md text-on-surface-variant">Test your knowledge</p>
                        </button>
                    </div>
                </div>

                <!-- Subject Progress Preview -->
                <div class="animate-in animate-in-delay-3">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="section-title" style="margin:0;">Subject Progress</h2>
                        <button class="btn btn-ghost btn-sm" onclick="navigate('subjects')">View All →</button>
                    </div>
                    <div class="grid grid-3">
                        ${[
                            { name:'Mathematics', icon:'calculate', color:'var(--primary)', bg:'rgba(0,74,198,0.1)', pct:65 },
                            { name:'Science',     icon:'science',   color:'var(--secondary)', bg:'rgba(0,110,47,0.1)', pct:42 },
                            { name:'English',     icon:'history_edu', color:'var(--tertiary)', bg:'rgba(120,75,0,0.1)', pct:78 },
                        ].map(s => `
                        <div class="card" style="border-top-color:${s.color};">
                            <div class="flex items-center gap-2 mb-4">
                                <div class="card-icon" style="background:${s.bg};color:${s.color};width:44px;height:44px;margin:0;"><span class="material-symbols-outlined">${s.icon}</span></div>
                                <strong>${s.name}</strong>
                            </div>
                            <div class="progress-bar" style="margin-bottom:8px;"><div class="progress-fill" style="width:${s.pct}%;background:${s.color};"></div></div>
                            <div class="flex justify-between" style="font-size:13px;color:var(--on-surface-variant);"><span>${s.pct}% done</span></div>
                        </div>`).join('')}
                    </div>
                </div>
            </div>
        </div>
    </div>
    ${buildBottomNav('dashboard')}`;
}

// ============================================================
// PAGE: AI TUTOR (CHAT)
// ============================================================
function renderAITutor() {
    if (!state.currentUser) { navigate('login'); return; }

    document.getElementById('app').innerHTML = `
    ${buildSidebar('ai_tutor')}
    <div class="app-layout">
        <div class="main-area">
            ${buildTopbar('AI Tutor')}
            <div class="chat-layout" style="flex:1;overflow:hidden;">
                <div class="chat-messages" id="chat-msgs">
                    <div class="chat-bubble ai animate-in">
                        <strong>👋 Hello, ${state.currentUser.name}!</strong><br>
                        I'm your offline AI Tutor. Ask me anything about your subjects and I'll answer using your uploaded textbooks!<br><br>
                        <em>Try: "Explain photosynthesis" or "What is gravity?"</em>
                    </div>
                </div>
                <div class="chat-footer">
                    <form class="chat-input-row" id="chat-form" onsubmit="sendChat(event)">
                        <input type="text" class="chat-input" id="chat-input" placeholder="Ask me anything..." autocomplete="off" maxlength="500">
                        <button type="submit" class="chat-send-btn" aria-label="Send">
                            <span class="material-symbols-outlined">send</span>
                        </button>
                    </form>
                    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                        ${['Explain photosynthesis','What is Newton\'s first law?','How do plants make food?','What is the water cycle?'].map(q =>
                            `<button class="btn btn-outlined btn-sm" onclick="quickAsk('${q}')">${q}</button>`
                        ).join('')}
                    </div>
                </div>
            </div>
        </div>
    </div>
    ${buildBottomNav('ai_tutor')}`;
}

function quickAsk(q) {
    document.getElementById('chat-input').value = q;
    sendChat(new Event('submit'));
}

async function sendChat(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const msgs = document.getElementById('chat-msgs');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    input.disabled = true;

    // User bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user animate-in';
    userBubble.textContent = msg;
    msgs.appendChild(userBubble);

    // Typing bubble
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble ai typing';
    typingBubble.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typingBubble);
    msgs.scrollTop = msgs.scrollHeight;

    try {
        const data = await apiPost('/api/ask', { question: msg, student_id: state.currentUser?.id || 1 });
        typingBubble.className = 'chat-bubble ai animate-in';
        typingBubble.textContent = data.answer;
    } catch {
        typingBubble.className = 'chat-bubble ai animate-in';
        typingBubble.innerHTML = `<em style="color:var(--on-surface-variant);">⚠️ Couldn't reach the AI. Make sure Ollama is running and the backend server is active.</em>`;
    }
    msgs.scrollTop = msgs.scrollHeight;
    input.disabled = false;
    input.focus();
}

// ============================================================
// PAGE: MY SUBJECTS
// ============================================================
function renderSubjects() {
    if (!state.currentUser) { navigate('login'); return; }
    const subjects = [
        { name:'Mathematics', icon:'🔢', emoji:'calculate', color:'var(--primary)', bg:'rgba(0,74,198,0.1)', pct:65, lessons:'12/18', topic:'Fractions & Algebra' },
        { name:'Science',     icon:'🔬', emoji:'science',   color:'var(--secondary)', bg:'rgba(0,110,47,0.1)', pct:42, lessons:'5/12', topic:'The Solar System' },
        { name:'English',     icon:'📖', emoji:'history_edu', color:'var(--tertiary)', bg:'rgba(120,75,0,0.1)', pct:78, lessons:'14/18', topic:'Grammar Fundamentals' },
        { name:'Tamil',       icon:'🌿', emoji:'language',  color:'#6d28d9', bg:'rgba(109,40,217,0.1)', pct:55, lessons:'8/15', topic:'Poetry & Prose' },
        { name:'Social Science', icon:'🌍', emoji:'public', color:'#0891b2', bg:'rgba(8,145,178,0.1)', pct:30, lessons:'4/14', topic:'Ancient Civilisations' },
        { name:'Computer Science', icon:'💻', emoji:'computer', color:'#0f766e', bg:'rgba(15,118,110,0.1)', pct:10, lessons:'1/10', topic:'Introduction to Programming' },
    ];

    document.getElementById('app').innerHTML = `
    ${buildSidebar('subjects')}
    <div class="app-layout">
        <div class="main-area">
            ${buildTopbar('My Subjects')}
            <div class="page-content">
                <div class="page-header animate-in">
                    <h1>My Subjects</h1>
                    <p>Pick up where you left off or start something new.</p>
                </div>
                <div class="grid grid-3 animate-in animate-in-delay-1">
                    ${subjects.map((s,i) => `
                    <div class="subject-card" style="border-top-color:${s.color};animation-delay:${i*0.05}s;" class="animate-in">
                        <div class="subject-card-banner" style="background:${s.bg};">
                            <span class="material-symbols-outlined icon-filled" style="font-size:72px;color:${s.color};">${s.emoji}</span>
                        </div>
                        <div class="subject-card-body">
                            <div>
                                <h3 class="text-headline-sm">${s.name}</h3>
                                <p class="text-body-md text-on-surface-variant">${s.topic}</p>
                            </div>
                            <div>
                                <div class="flex justify-between mb-2" style="font-size:13px;">
                                    <span style="font-weight:600;">${s.pct}% complete</span>
                                    <span style="color:var(--on-surface-variant);">${s.lessons} lessons</span>
                                </div>
                                <div class="progress-bar thick"><div class="progress-fill" style="width:${s.pct}%;background:${s.color};"></div></div>
                            </div>
                            <button class="btn btn-full" style="background:${s.color};color:white;" onclick="startSubjectQuiz('${s.name}')">
                                ${s.pct > 0 ? 'Continue' : 'Start'} <span class="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>
    </div>
    ${buildBottomNav('subjects')}`;
}

function startSubjectQuiz(subject) {
    state.quizSubject = subject;
    navigate('quiz');
}

// ============================================================
// PAGE: QUIZ
// ============================================================
function renderQuiz() {
    if (!state.currentUser) { navigate('login'); return; }

    const subjects = ['Mathematics','Science','English','Tamil','Social Science','Computer Science'];
    const defSubject = state.quizSubject || 'Science';

    document.getElementById('app').innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;background:var(--background);">
        <header style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:var(--surface-container-lowest);border-bottom:1px solid var(--outline-variant);flex-shrink:0;">
            <button class="btn btn-ghost btn-sm" onclick="navigate('subjects')"><span class="material-symbols-outlined">close</span>Exit</button>
            <div style="display:flex;align-items:center;gap:16px;">
                <div class="quiz-timer"><span class="material-symbols-outlined">timer</span><span id="quiz-timer-val">--:--</span></div>
                <div style="background:var(--primary-container);color:var(--on-primary-container);padding:6px 14px;border-radius:var(--r-full);font-size:13px;font-weight:700;" id="quiz-score-badge">Score: 0</div>
            </div>
        </header>
        <div id="quiz-body" style="flex:1;overflow-y:auto;">
            <div class="quiz-layout">
                <!-- Subject Picker -->
                <div id="quiz-picker" class="animate-in">
                    <div class="quiz-question-card" style="text-align:center;margin-bottom:32px;">
                        <span class="material-symbols-outlined icon-filled" style="font-size:56px;color:var(--primary);margin-bottom:16px;">assignment</span>
                        <h2 class="text-headline-lg" style="margin-bottom:8px;">Ready to Quiz?</h2>
                        <p class="text-body-lg text-on-surface-variant">Choose a subject and we'll generate 5 questions using AI!</p>
                    </div>
                    <div class="form-group" style="margin-bottom:24px;">
                        <label class="form-label">Select Subject</label>
                        <div class="input-wrap">
                            <span class="material-symbols-outlined input-icon">category</span>
                            <select id="quiz-subject-sel" class="input-field">
                                ${subjects.map(s => `<option value="${s}" ${s===defSubject?'selected':''}>${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-full btn-lg" id="start-quiz-btn" onclick="loadQuiz()">
                        <span class="material-symbols-outlined">play_arrow</span>Generate Quiz with AI
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

async function loadQuiz() {
    const btn = document.getElementById('start-quiz-btn');
    const subject = document.getElementById('quiz-subject-sel').value;
    state.quizSubject = subject;
    state.quizScore = 0;
    state.quizCurrent = 0;

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:white;"></div> AI is generating questions...';

    try {
        const data = await apiPost('/api/quiz/generate', { subject });
        state.quizData = data.quiz;
    } catch {
        // Demo fallback questions
        state.quizData = [
            { question: `What is the main topic studied in ${subject}?`, options: ['A broad academic field', 'A type of sport', 'A cooking technique', 'A musical genre'], correct_index: 0 },
            { question: 'What does "photosynthesis" mean?', options: ['Making food from light', 'Moving from place to place', 'Breathing underwater', 'Digesting food'], correct_index: 0 },
            { question: 'Which planet is closest to the Sun?', options: ['Earth', 'Venus', 'Mercury', 'Mars'], correct_index: 2 },
            { question: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correct_index: 1 },
            { question: 'What is H₂O commonly known as?', options: ['Salt', 'Sugar', 'Water', 'Oxygen'], correct_index: 2 },
        ];
        showToast('Using demo questions (backend not connected)', 'warning');
    }

    startQuizTimer(5 * 60); // 5 minutes
    showQuestion();
}

function startQuizTimer(seconds) {
    state.quizSecondsLeft = seconds;
    if (state.quizTimerInterval) clearInterval(state.quizTimerInterval);
    state.quizTimerInterval = setInterval(() => {
        state.quizSecondsLeft--;
        const el = document.getElementById('quiz-timer-val');
        if (el) {
            const m = Math.floor(state.quizSecondsLeft / 60).toString().padStart(2,'0');
            const s = (state.quizSecondsLeft % 60).toString().padStart(2,'0');
            el.textContent = `${m}:${s}`;
        }
        if (state.quizSecondsLeft <= 0) {
            clearInterval(state.quizTimerInterval);
            showQuizResults();
        }
    }, 1000);
}

function showQuestion() {
    const q = state.quizData[state.quizCurrent];
    const total = state.quizData.length;
    const pct = (state.quizCurrent / total) * 100;
    const letters = ['A','B','C','D'];

    const body = document.getElementById('quiz-body');
    body.innerHTML = `
    <div class="quiz-layout animate-in">
        <div style="margin-bottom:24px;">
            <div class="flex justify-between mb-2">
                <span class="text-label-sm text-on-surface-variant">Question ${state.quizCurrent + 1} of ${total}</span>
                <span class="text-label-sm" style="color:var(--primary);">${state.quizSubject}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;"></div></div>
        </div>
        <div class="quiz-question-card">
            <p class="text-label-sm text-on-surface-variant" style="margin-bottom:12px;">QUESTION ${state.quizCurrent + 1}</p>
            <h2 class="quiz-question-text">${q.question}</h2>
        </div>
        <div class="quiz-options">
            ${q.options.map((opt, i) => `
            <button class="quiz-option" id="opt-${i}" onclick="selectAnswer(${i}, ${q.correct_index})">
                <div class="quiz-option-letter">${letters[i]}</div>
                <span>${opt}</span>
            </button>`).join('')}
        </div>
        <div class="flex justify-between items-center" style="margin-top:16px;">
            <span class="text-body-md text-on-surface-variant">${total - state.quizCurrent - 1} questions left</span>
            <button class="btn btn-ghost btn-sm" id="next-btn" style="display:none;" onclick="nextQuestion()">
                ${state.quizCurrent + 1 < total ? 'Next Question' : 'See Results'} <span class="material-symbols-outlined">arrow_forward</span>
            </button>
        </div>
    </div>`;

    document.getElementById('quiz-score-badge').textContent = `Score: ${state.quizScore}/${state.quizData.length}`;
}

function selectAnswer(selected, correct) {
    // Disable all options
    document.querySelectorAll('.quiz-option').forEach(el => el.classList.add('disabled'));
    const selectedEl = document.getElementById(`opt-${selected}`);
    const correctEl = document.getElementById(`opt-${correct}`);

    if (selected === correct) {
        selectedEl.classList.add('correct');
        state.quizScore++;
        showToast('Correct! 🎉', 'success');
    } else {
        selectedEl.classList.add('wrong');
        correctEl.classList.add('correct');
        showToast('Not quite — see the correct answer above!', 'warning');
    }

    document.getElementById('quiz-score-badge').textContent = `Score: ${state.quizScore}/${state.quizData.length}`;
    document.getElementById('next-btn').style.display = 'flex';
}

function nextQuestion() {
    state.quizCurrent++;
    if (state.quizCurrent < state.quizData.length) {
        showQuestion();
    } else {
        showQuizResults();
    }
}

function showQuizResults() {
    if (state.quizTimerInterval) clearInterval(state.quizTimerInterval);
    const score = state.quizScore;
    const total = state.quizData.length;
    const pct = Math.round((score / total) * 100);
    const grade = pct >= 80 ? '🏆 Excellent!' : pct >= 60 ? '👍 Good Job!' : pct >= 40 ? '📚 Keep Studying!' : '💪 Try Again!';
    const color = pct >= 80 ? 'var(--secondary)' : pct >= 60 ? 'var(--primary)' : pct >= 40 ? 'var(--tertiary)' : 'var(--error)';

    const body = document.getElementById('quiz-body');
    body.innerHTML = `
    <div class="quiz-layout animate-in" style="text-align:center;padding-top:48px;">
        <div style="width:120px;height:120px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;box-shadow:var(--shadow-3);">
            <span style="font-size:52px;font-weight:800;color:white;">${pct}%</span>
        </div>
        <h2 class="text-headline-lg" style="margin-bottom:8px;">${grade}</h2>
        <p class="text-body-lg text-on-surface-variant" style="margin-bottom:32px;">You scored <strong>${score}</strong> out of <strong>${total}</strong> questions.</p>

        <div class="grid grid-2" style="margin-bottom:32px;text-align:left;">
            <div class="card card-secondary">
                <h4 class="text-label-sm text-on-surface-variant" style="margin-bottom:8px;">CORRECT</h4>
                <div class="text-display-md text-secondary">${score}</div>
            </div>
            <div class="card card-error" style="border-top-color:var(--error);">
                <h4 class="text-label-sm text-on-surface-variant" style="margin-bottom:8px;">WRONG</h4>
                <div class="text-display-md" style="color:var(--error);">${total - score}</div>
            </div>
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
            <button class="btn btn-primary btn-lg" onclick="replayQuiz()"><span class="material-symbols-outlined">refresh</span>Try Again</button>
            <button class="btn btn-secondary btn-lg" onclick="navigate('progress')"><span class="material-symbols-outlined">trending_up</span>View Progress</button>
            <button class="btn btn-outlined btn-lg" onclick="navigate('subjects')"><span class="material-symbols-outlined">auto_stories</span>Subjects</button>
        </div>
    </div>`;

    // Save progress
    if (state.currentUser?.id) {
        apiPost('/api/quiz/submit', {
            student_id: state.currentUser.id,
            subject: state.quizSubject,
            score: pct,
        }).catch(() => {});
    }
}

function replayQuiz() {
    state.quizCurrent = 0;
    state.quizScore = 0;
    loadQuiz();
}

// ============================================================
// PAGE: PROGRESS
// ============================================================
function renderProgress() {
    if (!state.currentUser) { navigate('login'); return; }

    document.getElementById('app').innerHTML = `
    ${buildSidebar('progress')}
    <div class="app-layout">
        <div class="main-area">
            ${buildTopbar('My Progress')}
            <div class="page-content">
                <div class="page-header animate-in">
                    <h1>Your Progress</h1>
                    <p>Track your learning journey and celebrate wins!</p>
                </div>

                <!-- Motivational Banner -->
                <div class="card card-tertiary animate-in animate-in-delay-1" style="margin-bottom:32px;display:flex;align-items:center;gap:20px;">
                    <div style="width:64px;height:64px;background:var(--tertiary-container);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <span class="material-symbols-outlined icon-filled" style="font-size:34px;color:var(--on-tertiary-container);">emoji_events</span>
                    </div>
                    <div>
                        <h3 class="text-headline-sm">"Great things never come from comfort zones."</h3>
                        <p class="text-body-md text-on-surface-variant">You're on a 5-day streak! Keep going — you're amazing!</p>
                    </div>
                </div>

                <!-- Bento Grid -->
                <div class="grid grid-3 animate-in animate-in-delay-2" style="margin-bottom:32px;">
                    <!-- Streak -->
                    <div class="card" style="border-top-color:var(--tertiary);">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-headline-sm">Learning Streak 🔥</h3>
                            <span class="badge badge-warning">5 Days</span>
                        </div>
                        <div style="font-size:52px;font-weight:800;color:var(--tertiary);line-height:1;margin-bottom:16px;">5</div>
                        <div class="streak-dots">
                            ${['M','T','W','T','F','S','S'].map((d,i) => `
                            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                                <span style="font-size:11px;font-weight:700;color:var(--on-surface-variant);">${d}</span>
                                <div class="streak-dot ${i < 4 ? 'done' : i === 4 ? 'today' : 'empty'}">
                                    ${i < 4 ? '<span class="material-symbols-outlined" style="font-size:14px;">check</span>' : i === 4 ? '🔥' : ''}
                                </div>
                            </div>`).join('')}
                        </div>
                    </div>

                    <!-- Daily Goal -->
                    <div class="card" style="border-top-color:var(--secondary);">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-headline-sm">Daily Goal</h3>
                            <span class="material-symbols-outlined icon-filled" style="color:var(--secondary);">flag</span>
                        </div>
                        <div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:16px;">
                            <span style="font-size:40px;font-weight:800;line-height:1;">45</span>
                            <span class="text-body-lg text-on-surface-variant" style="padding-bottom:4px;">/ 60 min</span>
                        </div>
                        <div class="progress-bar thick" style="margin-bottom:12px;"><div class="progress-fill" style="width:75%;"></div></div>
                        <p class="text-body-md" style="background:rgba(0,110,47,0.08);padding:10px;border-radius:var(--r-sm);color:var(--secondary);">Almost there! 15 more minutes to reach your goal.</p>
                    </div>

                    <!-- Badges -->
                    <div class="card" style="border-top-color:var(--primary);">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-headline-sm">Badges</h3>
                            <a href="javascript:void(0)" style="font-size:13px;color:var(--primary);font-weight:600;">View All</a>
                        </div>
                        <div class="badge-grid">
                            ${[
                                { icon:'science', color:'var(--tertiary-container)', label:'Scientist', bg:'rgba(120,75,0,0.15)', locked:false },
                                { icon:'menu_book', color:'var(--primary-container)', label:'Bookworm', bg:'rgba(0,74,198,0.1)', locked:false },
                                { icon:'calculate', color:'var(--surface-container)', label:'Math Whiz', bg:'var(--surface-container)', locked:true },
                            ].map(b => `
                            <div class="badge-item ${b.locked ? 'locked' : ''}">
                                <div class="badge-icon" style="background:${b.bg};">
                                    <span class="material-symbols-outlined icon-filled" style="color:${b.color};font-size:26px;">${b.icon}</span>
                                </div>
                                <span style="font-size:11px;font-weight:700;">${b.label}</span>
                            </div>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- Subject Mastery -->
                <div class="animate-in animate-in-delay-3">
                    <h2 class="section-title">Subject Mastery</h2>
                    <div style="display:flex;flex-direction:column;gap:16px;">
                        ${[
                            { name:'Mathematics', pct:65, color:'var(--primary)' },
                            { name:'Science', pct:42, color:'var(--secondary)' },
                            { name:'English', pct:78, color:'var(--tertiary)' },
                            { name:'Tamil', pct:55, color:'#6d28d9' },
                        ].map(s => `
                        <div class="flex items-center gap-4" style="background:var(--surface-container-lowest);padding:16px;border-radius:var(--r-md);box-shadow:var(--shadow-1);">
                            <div style="width:52px;height:52px;border-radius:50%;background:conic-gradient(${s.color} ${s.pct}%, var(--surface-container-high) 0);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <div style="width:36px;height:36px;background:var(--surface-container-lowest);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${s.pct}%</div>
                            </div>
                            <div style="flex:1;">
                                <div class="flex justify-between mb-2"><strong>${s.name}</strong><span class="text-label-sm text-on-surface-variant">${s.pct}%</span></div>
                                <div class="progress-bar"><div class="progress-fill" style="width:${s.pct}%;background:${s.color};"></div></div>
                            </div>
                            <button class="btn btn-sm btn-outlined" onclick="startSubjectQuiz('${s.name}')">Practice</button>
                        </div>`).join('')}
                    </div>
                </div>
            </div>
        </div>
    </div>
    ${buildBottomNav('progress')}`;
}

// ============================================================
// PAGE: TEACHER DASHBOARD
// ============================================================
function renderTeacherDashboard() {
    if (!state.isTeacher) { navigate('teacher_login'); return; }

    document.getElementById('app').innerHTML = `
    ${buildSidebar('teacher_dashboard', true)}
    <div class="app-layout">
        <div class="main-area">
            ${buildTopbar('Teacher Dashboard', true)}
            <div class="page-content">
                <div class="page-header animate-in">
                    <h1>Welcome back, Teacher! 👋</h1>
                    <p>Manage resources, track students, and upload learning materials.</p>
                </div>

                <!-- Stats -->
                <div class="grid grid-4 animate-in animate-in-delay-1" style="margin-bottom:32px;">
                    <div class="stat-card card-primary">
                        <div class="stat-card-header"><span class="text-label-sm text-on-surface-variant">STUDENTS</span><div class="stat-card-icon" style="background:rgba(0,74,198,0.1);color:var(--primary);"><span class="material-symbols-outlined">groups</span></div></div>
                        <div class="stat-card-value text-primary" id="stat-students">—</div>
                        <div class="stat-card-label">Registered Students</div>
                    </div>
                    <div class="stat-card card-secondary">
                        <div class="stat-card-header"><span class="text-label-sm text-on-surface-variant">BOOKS</span><div class="stat-card-icon" style="background:rgba(0,110,47,0.1);color:var(--secondary);"><span class="material-symbols-outlined">library_books</span></div></div>
                        <div class="stat-card-value text-secondary" id="stat-docs">—</div>
                        <div class="stat-card-label">Uploaded PDFs</div>
                    </div>
                    <div class="stat-card card-tertiary">
                        <div class="stat-card-header"><span class="text-label-sm text-on-surface-variant">AVG SCORE</span><div class="stat-card-icon" style="background:rgba(120,75,0,0.1);color:var(--tertiary);"><span class="material-symbols-outlined">grade</span></div></div>
                        <div class="stat-card-value text-tertiary">84%</div>
                        <div class="stat-card-label">Class Average</div>
                    </div>
                    <div class="stat-card" style="border-top-color:var(--error);">
                        <div class="stat-card-header"><span class="text-label-sm text-on-surface-variant">ATTENTION</span><div class="stat-card-icon" style="background:rgba(186,26,26,0.1);color:var(--error);"><span class="material-symbols-outlined">warning</span></div></div>
                        <div class="stat-card-value" style="color:var(--error);">3</div>
                        <div class="stat-card-label">Weak Chapters</div>
                    </div>
                </div>

                <!-- Upload + File List -->
                <div class="grid grid-12 animate-in animate-in-delay-2">
                    <div class="col-4">
                        <h2 class="section-title">Upload Textbook</h2>
                        <div class="upload-zone" id="upload-zone" onclick="document.getElementById('pdf-input').click()" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
                            <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                            <div>
                                <p class="text-label-lg" style="margin-bottom:4px;">Drag & Drop PDF here</p>
                                <p class="text-body-md text-on-surface-variant">or click to browse files</p>
                            </div>
                            <input type="file" id="pdf-input" accept=".pdf" style="display:none;" multiple onchange="handleFileSelect(event)">
                        </div>
                        <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;" id="pending-files"></div>
                    </div>
                    <div class="col-8">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="section-title" style="margin:0;">Uploaded Books</h2>
                            <button class="btn btn-ghost btn-sm" onclick="loadTeacherDocs()"><span class="material-symbols-outlined">refresh</span>Refresh</button>
                        </div>
                        <div id="docs-list" style="display:flex;flex-direction:column;gap:10px;">
                            <div style="text-align:center;padding:32px;color:var(--on-surface-variant);">
                                <div class="spinner" style="margin:0 auto 12px;"></div>Loading...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    loadTeacherDocs();
    loadTeacherStats();
}

async function loadTeacherStats() {
    try {
        const data = await apiGet('/api/teacher/stats');
        const s = document.getElementById('stat-students');
        const d = document.getElementById('stat-docs');
        if (s) s.textContent = data.students ?? '—';
        if (d) d.textContent = data.documents ?? '—';
    } catch { /* ignore */ }
}

async function loadTeacherDocs() {
    const list = document.getElementById('docs-list');
    if (!list) return;
    try {
        const data = await apiGet('/api/documents');
        state.documents = data.documents || [];
        if (state.documents.length === 0) {
            list.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">folder_open</span><p>No books uploaded yet.<br>Upload your first PDF to get started!</p></div>`;
            return;
        }
        list.innerHTML = state.documents.map(doc => {
            const statusBadge = {
                indexed: `<span class="badge badge-secondary"><span class="material-symbols-outlined" style="font-size:14px;">check_circle</span>Indexed</span>`,
                pending: `<span class="badge badge-warning"><span class="material-symbols-outlined" style="font-size:14px;">sync</span>Processing</span>`,
                error:   `<span class="badge badge-error"><span class="material-symbols-outlined" style="font-size:14px;">error</span>Error</span>`,
            }[doc.status] || `<span class="badge">${doc.status}</span>`;
            return `
            <div class="file-list-item">
                <div class="file-icon" style="background:rgba(0,74,198,0.1);color:var(--primary);">
                    <span class="material-symbols-outlined">picture_as_pdf</span>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc.filename}</div>
                    <div style="font-size:12px;color:var(--on-surface-variant);">${doc.subject} • ${new Date(doc.upload_time).toLocaleDateString()}</div>
                </div>
                ${statusBadge}
                <button class="btn-icon" onclick="deleteDoc(${doc.id})" title="Delete"><span class="material-symbols-outlined" style="color:var(--error);">delete</span></button>
            </div>`;
        }).join('');
    } catch {
        list.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">cloud_off</span><p>Cannot reach server.<br>Make sure the backend is running.</p></div>`;
    }
}

function handleDragOver(e) { e.preventDefault(); document.getElementById('upload-zone')?.classList.add('dragging'); }
function handleDragLeave() { document.getElementById('upload-zone')?.classList.remove('dragging'); }
function handleDrop(e) {
    e.preventDefault();
    document.getElementById('upload-zone')?.classList.remove('dragging');
    const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
    if (files.length) queueUploads(files);
}
function handleFileSelect(e) { queueUploads([...e.target.files]); }

function queueUploads(files) {
    const pending = document.getElementById('pending-files');
    files.forEach(file => {
        showModal('Choose Subject', `
            <p class="text-body-md" style="margin-bottom:16px;"><strong>${file.name}</strong></p>
            <div class="form-group">
                <label class="form-label">Assign to Subject</label>
                <div class="input-wrap">
                    <span class="material-symbols-outlined input-icon">category</span>
                    <select id="modal-subject" class="input-field">
                        <option value="Mathematics">Mathematics</option>
                        <option value="Science">Science</option>
                        <option value="English">English</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Social Science">Social Science</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="General">General</option>
                    </select>
                </div>
            </div>`,
            `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="uploadFile()">Upload & Index</button>`
        );
        // Store file reference
        window._pendingFile = file;
    });
}

async function uploadFile() {
    const subject = document.getElementById('modal-subject')?.value || 'General';
    const file = window._pendingFile;
    closeModal();
    if (!file) return;

    const itemId = `upload-${Date.now()}`;
    const pending = document.getElementById('pending-files');
    if (pending) {
        pending.innerHTML += `
        <div id="${itemId}" class="file-list-item">
            <div class="file-icon" style="background:rgba(0,74,198,0.1);color:var(--primary);"><span class="material-symbols-outlined">picture_as_pdf</span></div>
            <div style="flex:1;">
                <div style="font-weight:600;font-size:13px;">${file.name}</div>
                <div style="font-size:12px;color:var(--on-surface-variant);">${subject}</div>
            </div>
            <div class="spinner"></div>
        </div>`;
    }

    try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('subject', subject);
        const res = await apiUpload('/api/upload', fd);
        showToast(`✅ "${file.name}" indexed successfully!`, 'success');
        document.getElementById(itemId)?.remove();
        loadTeacherDocs();
        loadTeacherStats();
    } catch (err) {
        showToast(`Upload failed: ${err.message}`, 'error');
        document.getElementById(itemId)?.remove();
    }
}

async function deleteDoc(id) {
    if (!confirm('Delete this document from the knowledge base?')) return;
    try {
        await apiPost('/api/documents/delete', { doc_id: id });
        showToast('Document deleted', 'info');
        loadTeacherDocs();
    } catch {
        showToast('Could not delete document', 'error');
    }
}

// ============================================================
// SERVICE WORKER
// ============================================================
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('[EduMentor] Service Worker registered'))
            .catch(err => console.warn('[EduMentor] SW registration failed', err));
    }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Wait for splash animation, then navigate
    setTimeout(() => {
        navigate('welcome');
    }, 1300);
    registerSW();
});
