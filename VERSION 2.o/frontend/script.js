/* ============================================================
   EDU MENTOR AI — Complete SPA v2.0
   Production Ready: Real DB, Dynamic Data, Real Auth
   ============================================================ */
'use strict';

// ── State ────────────────────────────────────────────────────
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
    progressData: [],
    subjectsList: [],
};

// ── API Helpers ───────────────────────────────────────────────
async function apiPost(path, body) {
    const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server error' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
}

async function apiGet(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function apiUpload(path, formData) {
    const res = await fetch(path, { method: 'POST', body: formData });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined icon-filled">${icons[type] || 'info'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s cubic-bezier(0.2,0,0,1) forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ── Modal ─────────────────────────────────────────────────────
function showModal(title, bodyHTML, footerHTML = '') {
    closeModal();
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
    document.getElementById('active-modal')?.remove();
}

// ── Router ────────────────────────────────────────────────────
async function navigate(page, opts = {}) {
    if (state.quizTimerInterval && page !== 'quiz') {
        clearInterval(state.quizTimerInterval);
        state.quizTimerInterval = null;
    }
    state.currentPage = page;
    const app = document.getElementById('app');
    app.innerHTML = '';

    const pages = {
        welcome:          renderWelcome,
        login:            renderLogin,
        register:         renderRegister,
        teacher_login:    renderTeacherLogin,
        dashboard:        renderDashboard,
        ai_tutor:         renderAITutor,
        subjects:         renderSubjects,
        quiz:             renderQuiz,
        progress:         renderProgress,
        teacher_dashboard: renderTeacherDashboard,
    };

    if (['dashboard', 'subjects', 'quiz', 'progress', 'ai_tutor'].includes(page) && !state.currentUser) {
        page = 'login';
    }

    if (page === 'teacher_dashboard' && !state.isTeacher) {
        page = 'teacher_login';
    }

    // Pre-fetch global data if needed
    if (page === 'subjects' || page === 'quiz') {
        try {
            const data = await apiGet('/api/subjects');
            state.subjectsList = data.subjects || [];
        } catch {
            state.subjectsList = ["Mathematics", "Science", "English"]; // fallback for complete offline failure
        }
    }

    (pages[page] || renderNotFound)(opts);

    document.querySelectorAll('.bottom-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
}

function renderNotFound() {
    document.getElementById('app').innerHTML = `
    <div class="fullpage">
        <div class="empty-state">
            <span class="material-symbols-outlined" style="font-size:64px;color:var(--error);">error_outline</span>
            <h2>Page Not Found</h2>
            <p>This page doesn't exist.</p>
            <button class="btn btn-primary" onclick="navigate('welcome')">Go Home</button>
        </div>
    </div>`;
}

// ── Layout Builders ───────────────────────────────────────────
function buildSidebar(activePage, isTeacher = false) {
    const studentLinks = [
        { page: 'dashboard',  icon: 'dashboard',   label: 'Dashboard' },
        { page: 'subjects',   icon: 'auto_stories', label: 'My Subjects' },
        { page: 'ai_tutor',  icon: 'psychology',   label: 'AI Tutor' },
        { page: 'quiz',       icon: 'assignment',   label: 'Quizzes' },
        { page: 'progress',   icon: 'trending_up',  label: 'Progress' },
    ];
    const teacherLinks = [
        { page: 'teacher_dashboard', icon: 'dashboard', label: 'Overview' },
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
            <div class="sidebar-logo" onclick="navigate('${isTeacher ? 'teacher_dashboard' : 'dashboard'}')" style="cursor:pointer;">
                <div class="sidebar-logo-icon"><span class="material-symbols-outlined">school</span></div>
                <div>
                    <div class="sidebar-logo-text">EduMentor</div>
                    <div class="sidebar-logo-sub">${isTeacher ? 'Teacher Panel' : 'Student Portal'}</div>
                </div>
            </div>
        </div>
        <nav class="sidebar-nav">${navItems}</nav>
        <div class="sidebar-footer">${footerBtn}
        ${!isTeacher ? `<button class="btn btn-ghost btn-full" style="margin-top:8px;color:var(--error);" onclick="logout()"><span class="material-symbols-outlined">logout</span>Logout</button>` : ''}
        </div>
    </nav>`;
}

function openSidebar()  { document.getElementById('main-sidebar')?.classList.add('open');    document.getElementById('sidebar-overlay')?.classList.add('open'); }
function closeSidebar() { document.getElementById('main-sidebar')?.classList.remove('open'); document.getElementById('sidebar-overlay')?.classList.remove('open'); }

function buildTopbar(title, isTeacher = false) {
    const initial = isTeacher ? 'T' : (state.currentUser?.name?.[0]?.toUpperCase() || 'S');
    return `
    <header class="topbar">
        <div class="flex items-center gap-2">
            <button class="btn-icon" id="menu-toggle" onclick="openSidebar()" aria-label="Open menu" style="display:none;">
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
        (function() {
            const toggle = document.getElementById('menu-toggle');
            if (toggle) toggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
            window.addEventListener('resize', () => {
                const t = document.getElementById('menu-toggle');
                if (t) t.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
            });
        })();
    <\/script>`;
}

function buildBottomNav(active, isTeacher = false) {
    if (isTeacher) return '';
    const items = [
        { page: 'dashboard', icon: 'home',        label: 'Home' },
        { page: 'subjects',  icon: 'auto_stories', label: 'Subjects' },
        { page: 'ai_tutor', icon: 'psychology',   label: 'AI Tutor' },
        { page: 'quiz',      icon: 'assignment',   label: 'Quiz' },
        { page: 'progress',  icon: 'trending_up',  label: 'Progress' },
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

// ── Logout ────────────────────────────────────────────────────
function logout() {
    state.currentUser = null;
    state.isTeacher   = false;
    state.progressData = [];
    showToast('Logged out successfully', 'info');
    navigate('welcome');
}

// ══════════════════════════════════════════════════════════════
// PAGES
// ══════════════════════════════════════════════════════════════

// ── Welcome ───────────────────────────────────────────────────
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

// ── Student Register ──────────────────────────────────────────
function renderRegister() {
    document.getElementById('app').innerHTML = `
    <div class="fullpage">
        <div class="auth-card animate-in">
            <div style="text-align:center;margin-bottom:28px;">
                <span class="material-symbols-outlined auth-icon text-primary">person_add</span>
                <h1 class="text-headline-md" style="margin-bottom:6px;">Create Account</h1>
                <p class="text-body-md text-on-surface-variant">Join Edu Mentor AI</p>
            </div>
            <form id="register-form" style="display:flex;flex-direction:column;gap:16px;">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">badge</span>
                        <input type="text" id="reg-user" class="input-field" placeholder="Unique username" required autocomplete="off">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">person</span>
                        <input type="text" id="reg-name" class="input-field" placeholder="Your full name" required autocomplete="off">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">lock</span>
                        <input type="password" id="reg-pass" class="input-field" placeholder="Create password" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Your Class</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">auto_stories</span>
                        <select id="reg-grade" class="input-field" required>
                            <option value="" disabled selected>Select your class</option>
                            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n => `<option value="${n}">Class ${n}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary btn-full" style="margin-top:8px;" id="reg-btn">
                    Register <span class="material-symbols-outlined">arrow_forward</span>
                </button>
                <p style="text-align:center;font-size:14px;">Already have an account? <a href="#" onclick="navigate('login')">Login</a></p>
                <button type="button" class="btn btn-ghost btn-full" onclick="navigate('welcome')">← Back to Home</button>
            </form>
        </div>
    </div>`;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn   = document.getElementById('reg-btn');
        const user  = document.getElementById('reg-user').value.trim();
        const name  = document.getElementById('reg-name').value.trim();
        const pass  = document.getElementById('reg-pass').value;
        const grade = document.getElementById('reg-grade').value;
        
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Registering...';
        
        try {
            const data = await apiPost('/api/student/register', { username: user, name: name, password: pass, grade: grade });
            state.currentUser = { id: data.student_id, name: data.name, grade: data.grade };
            state.isTeacher   = false;
            showToast(`Welcome, ${data.name}! 🎉`, 'success');
            navigate('dashboard');
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = 'Register <span class="material-symbols-outlined">arrow_forward</span>';
            showToast(err.message, 'error');
        }
    });
}

// ── Student Login ─────────────────────────────────────────────
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
                    <label class="form-label">Username</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">badge</span>
                        <input type="text" id="login-user" class="input-field" placeholder="Enter username" required autocomplete="off">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <div class="input-wrap">
                        <span class="material-symbols-outlined input-icon">lock</span>
                        <input type="password" id="login-pass" class="input-field" placeholder="Enter password" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary btn-full" style="margin-top:8px;" id="login-btn">
                    Login <span class="material-symbols-outlined">arrow_forward</span>
                </button>
                <p style="text-align:center;font-size:14px;">New student? <a href="#" onclick="navigate('register')">Create an account</a></p>
                <button type="button" class="btn btn-ghost btn-full" onclick="navigate('welcome')">← Back to Home</button>
            </form>
        </div>
    </div>`;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn   = document.getElementById('login-btn');
        const user  = document.getElementById('login-user').value.trim();
        const pass  = document.getElementById('login-pass').value;
        
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Logging in...';
        
        try {
            const data = await apiPost('/api/student/login', { username: user, password: pass });
            state.currentUser = { id: data.student_id, name: data.name, grade: data.grade };
            state.isTeacher   = false;
            showToast(`Welcome back, ${data.name}! 🎉`, 'success');
            navigate('dashboard');
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = 'Login <span class="material-symbols-outlined">arrow_forward</span>';
            showToast(err.message, 'error');
        }
    });
}

// ── Teacher Login ─────────────────────────────────────────────
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
                        <input type="text" id="teacher-user" class="input-field" placeholder="Enter username" required autocomplete="off">
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
                <button type="button" class="btn btn-ghost btn-full" onclick="navigate('welcome')">← Back to Home</button>
            </form>
        </div>
    </div>`;

    document.getElementById('teacher-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn  = document.getElementById('teacher-btn');
        const user = document.getElementById('teacher-user').value.trim();
        const pass = document.getElementById('teacher-pass').value;
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Logging in...';
        try {
            const data = await apiPost('/api/teacher/login', { username: user, password: pass });
            state.isTeacher   = true;
            state.currentUser = { id: data.teacher_id, name: 'Teacher' };
            showToast('Welcome back, Teacher! 👋', 'success');
            navigate('teacher_dashboard');
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = 'Login <span class="material-symbols-outlined">arrow_forward</span>';
            showToast(err.message, 'error');
        }
    });
}

// ── Dashboard ─────────────────────────────────────────────────
function renderDashboard() {
    if (!state.currentUser) { navigate('login'); return; }
    const name  = state.currentUser.name;
    const hour  = new Date().getHours();
    const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    document.getElementById('app').innerHTML = `
    ${buildSidebar('dashboard')}
    <div class="app-layout">
        <div class="main-area">
            ${buildTopbar('Dashboard')}
            <div class="page-content">
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
                        <div class="stat-card-value text-secondary" id="dash-streak">—</div>
                        <div class="stat-card-label">Best Streak 🔥</div>
                    </div>
                    <div class="stat-card card-tertiary">
                        <div class="stat-card-header">
                            <span class="text-label-sm text-on-surface-variant">QUIZZES</span>
                            <div class="stat-card-icon" style="background:rgba(120,75,0,0.1);color:var(--tertiary);"><span class="material-symbols-outlined">assignment_turned_in</span></div>
                        </div>
                        <div class="stat-card-value text-tertiary" id="dash-quizzes">—</div>
                        <div class="stat-card-label">Quizzes Done</div>
                    </div>
                    <div class="stat-card" style="border-top-color:var(--error);">
                        <div class="stat-card-header">
                            <span class="text-label-sm text-on-surface-variant">SCORE</span>
                            <div class="stat-card-icon" style="background:rgba(186,26,26,0.1);color:var(--error);"><span class="material-symbols-outlined">emoji_events</span></div>
                        </div>
                        <div class="stat-card-value" style="color:var(--error);" id="dash-score">—</div>
                        <div class="stat-card-label">Avg Score</div>
                    </div>
                </div>

                <!-- Hero Banner -->
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
                        <button class="card" style="border-top:4px solid var(--tertiary);width:100%;text-align:left;cursor:pointer;" onclick="navigate('quiz')">
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
                        <button class="btn btn-ghost btn-sm" onclick="navigate('progress')">View All →</button>
                    </div>
                    <div id="dash-progress-grid" class="grid grid-3">
                        <div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--on-surface-variant);">
                            <div class="spinner" style="margin:0 auto 8px;"></div>Loading progress...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    ${buildBottomNav('dashboard')}`;

    // Load real progress data from API
    loadDashboardProgress();
}

async function loadDashboardProgress() {
    if (!state.currentUser?.id) return;
    try {
        const data = await apiGet(`/api/progress/${state.currentUser.id}`);
        state.progressData = data.progress || [];

        // Update stat cards
        const streak = state.progressData.reduce((m, r) => Math.max(m, r.streak), 0);
        const totalQ = data.total_quizzes || 0;
        const avgScore = data.avg_score || 0;

        const elStreak  = document.getElementById('dash-streak');
        const elQuizzes = document.getElementById('dash-quizzes');
        const elScore   = document.getElementById('dash-score');
        if (elStreak)  elStreak.textContent  = streak;
        if (elQuizzes) elQuizzes.textContent = totalQ;
        if (elScore)   elScore.textContent   = avgScore ? `${avgScore}%` : '—';

        // Render progress grid
        const grid = document.getElementById('dash-progress-grid');
        if (!grid) return;

        const SUBJECT_META = {
            'Mathematics':    { icon: 'calculate',   color: 'var(--primary)',   bg: 'rgba(0,74,198,0.1)' },
            'Science':        { icon: 'science',      color: 'var(--secondary)', bg: 'rgba(0,110,47,0.1)' },
            'English':        { icon: 'history_edu',  color: 'var(--tertiary)',  bg: 'rgba(120,75,0,0.1)' },
            'Tamil':          { icon: 'language',     color: '#6d28d9',          bg: 'rgba(109,40,217,0.1)' },
            'Social Science': { icon: 'public',       color: '#0891b2',          bg: 'rgba(8,145,178,0.1)' },
            'Computer Science': { icon: 'computer',   color: '#0f766e',          bg: 'rgba(15,118,110,0.1)' },
        };

        if (state.progressData.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;" class="empty-state">
                <span class="material-symbols-outlined">trending_up</span>
                <p>No quiz data yet. Take a quiz to see your progress!</p>
                <button class="btn btn-primary" onclick="navigate('quiz')">Take a Quiz</button>
            </div>`;
            return;
        }

        grid.innerHTML = state.progressData.map(s => {
            const meta = SUBJECT_META[s.subject] || { icon: 'school', color: 'var(--primary)', bg: 'rgba(0,74,198,0.1)' };
            const completion = Math.round(s.completion);
            return `
            <div class="card" style="border-top-color:${meta.color};">
                <div class="flex items-center gap-2 mb-4">
                    <div class="card-icon" style="background:${meta.bg};color:${meta.color};width:44px;height:44px;margin:0;"><span class="material-symbols-outlined">${meta.icon}</span></div>
                    <strong>${s.subject}</strong>
                </div>
                <div class="progress-bar" style="margin-bottom:8px;"><div class="progress-fill" style="width:${completion}%;background:${meta.color};"></div></div>
                <div class="flex justify-between" style="font-size:13px;color:var(--on-surface-variant);">
                    <span>${completion}% score</span><span>${s.streak} quizzes</span>
                </div>
            </div>`;
        }).join('');
    } catch {
        // Silent fail for dashboard
    }
}

// ── AI Tutor ──────────────────────────────────────────────────
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
                        <button type="submit" class="chat-send-btn" id="chat-send-btn" aria-label="Send">
                            <span class="material-symbols-outlined">send</span>
                        </button>
                    </form>
                    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                        ${['Explain photosynthesis','What is Newton\'s first law?','How do plants make food?'].map(q =>
                            `<button class="btn btn-outlined btn-sm" onclick="quickAsk('${q.replace(/'/g, "\\'")}')">${q}</button>`
                        ).join('')}
                    </div>
                </div>
            </div>
        </div>
    </div>
    ${buildBottomNav('ai_tutor')}`;
    
    // Load history
    loadChatHistory();
}

async function loadChatHistory() {
    const msgs = document.getElementById('chat-msgs');
    if (!msgs || !state.currentUser?.id) return;
    try {
        const data = await apiGet(`/api/chat_history/${state.currentUser.id}`);
        if (data.history && data.history.length > 0) {
            data.history.forEach(h => {
                const userBubble = document.createElement('div');
                userBubble.className = 'chat-bubble user';
                userBubble.textContent = h.question;
                msgs.appendChild(userBubble);
                
                const aiBubble = document.createElement('div');
                aiBubble.className = 'chat-bubble ai';
                aiBubble.innerHTML = (h.answer || '').replace(/\n/g, '<br>');
                msgs.appendChild(aiBubble);
            });
            msgs.scrollTop = msgs.scrollHeight;
        }
    } catch {
        // silent fail on history load
    }
}

function quickAsk(q) {
    const input = document.getElementById('chat-input');
    if (input) { input.value = q; sendChat(new Event('submit')); }
}

async function sendChat(e) {
    e.preventDefault();
    const input   = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const msgs    = document.getElementById('chat-msgs');
    const msg     = input?.value.trim();
    if (!msg || !msgs) return;

    input.value    = '';
    input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user animate-in';
    userBubble.textContent = msg;
    msgs.appendChild(userBubble);

    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble ai typing';
    typingBubble.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typingBubble);
    msgs.scrollTop = msgs.scrollHeight;

    try {
        const data = await apiPost('/api/ask', { question: msg, student_id: state.currentUser?.id || 1 });
        typingBubble.className = 'chat-bubble ai animate-in';
        typingBubble.innerHTML = (data.answer || 'No answer returned.').replace(/\n/g, '<br>');
    } catch (err) {
        typingBubble.className = 'chat-bubble ai animate-in';
        typingBubble.innerHTML = `<em style="color:var(--error);">⚠️ ${err.message || 'Couldn\'t reach the AI. Make sure Ollama is running.'}</em>`;
    }

    msgs.scrollTop = msgs.scrollHeight;
    if (input)   { input.disabled   = false; input.focus(); }
    if (sendBtn)   sendBtn.disabled  = false;
}

// ── My Subjects ───────────────────────────────────────────────
function renderSubjects() {
    if (!state.currentUser) { navigate('login'); return; }

    const SUBJECT_META = {
        'Mathematics':    { icon: 'calculate',   color: 'var(--primary)',   bg: 'rgba(0,74,198,0.1)' },
        'Science':        { icon: 'science',      color: 'var(--secondary)', bg: 'rgba(0,110,47,0.1)' },
        'English':        { icon: 'history_edu',  color: 'var(--tertiary)',  bg: 'rgba(120,75,0,0.1)' },
        'Tamil':          { icon: 'language',     color: '#6d28d9',          bg: 'rgba(109,40,217,0.1)' },
        'Social Science': { icon: 'public',       color: '#0891b2',          bg: 'rgba(8,145,178,0.1)' },
        'Computer Science': { icon: 'computer',   color: '#0f766e',          bg: 'rgba(15,118,110,0.1)' },
    };

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
                <div class="grid grid-3 animate-in animate-in-delay-1" id="subjects-grid">
                    ${state.subjectsList.map((subjectName, i) => {
                        const sMeta = SUBJECT_META[subjectName] || { icon: 'school', color: 'var(--primary)', bg: 'rgba(0,74,198,0.1)' };
                        const prog = state.progressData.find(p => p.subject === subjectName);
                        const pct  = prog ? Math.round(prog.completion) : 0;
                        const streaks = prog ? prog.streak : 0;
                        return `
                        <div class="subject-card" style="border-top-color:${sMeta.color};animation-delay:${i*0.05}s;">
                            <div class="subject-card-banner" style="background:${sMeta.bg};">
                                <span class="material-symbols-outlined icon-filled" style="font-size:72px;color:${sMeta.color};">${sMeta.icon}</span>
                            </div>
                            <div class="subject-card-body">
                                <div>
                                    <h3 class="text-headline-sm">${subjectName}</h3>
                                </div>
                                <div>
                                    <div class="flex justify-between mb-2" style="font-size:13px;">
                                        <span style="font-weight:600;">${pct > 0 ? pct + '% score' : 'Not started'}</span>
                                        <span style="color:var(--on-surface-variant);">${streaks} quizzes</span>
                                    </div>
                                    <div class="progress-bar thick"><div class="progress-fill" style="width:${pct}%;background:${sMeta.color};"></div></div>
                                </div>
                                <div style="display:flex;gap:8px;">
                                    <button class="btn btn-full" style="background:${sMeta.color};color:white;flex:1;" onclick="startSubjectQuiz('${subjectName}')">
                                        ${pct > 0 ? 'Practice More' : 'Start Quiz'} <span class="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                    <button class="btn btn-outlined" onclick="askAboutSubject('${subjectName}')" title="Ask AI about ${subjectName}">
                                        <span class="material-symbols-outlined">psychology</span>
                                    </button>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                    ${state.subjectsList.length === 0 ? '<div class="empty-state" style="grid-column:1/-1;">No subjects available yet. Ask your teacher to upload textbooks!</div>' : ''}
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

function askAboutSubject(subject) {
    state.currentPage = 'ai_tutor';
    navigate('ai_tutor');
    setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = `Explain the key topics in ${subject}`;
            input.focus();
        }
    }, 100);
}

// ── Quiz ──────────────────────────────────────────────────────
function renderQuiz() {
    if (!state.currentUser) { navigate('login'); return; }

    const defSubject = state.quizSubject || state.subjectsList[0] || 'General';

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
                <div id="quiz-picker" class="animate-in">
                    <div class="quiz-question-card" style="text-align:center;margin-bottom:32px;">
                        <span class="material-symbols-outlined icon-filled" style="font-size:56px;color:var(--primary);margin-bottom:16px;">assignment</span>
                        <h2 class="text-headline-lg" style="margin-bottom:8px;">Ready to Quiz?</h2>
                        <p class="text-body-lg text-on-surface-variant">Choose a subject and we'll generate 5 questions dynamically using RAG AI!</p>
                    </div>
                    <div class="form-group" style="margin-bottom:24px;">
                        <label class="form-label">Select Subject</label>
                        <div class="input-wrap">
                            <span class="material-symbols-outlined input-icon">category</span>
                            <select id="quiz-subject-sel" class="input-field">
                                ${state.subjectsList.map(s => `<option value="${s}" ${s===defSubject?'selected':''}>${s}</option>`).join('')}
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
    const btn     = document.getElementById('start-quiz-btn');
    const subject = document.getElementById('quiz-subject-sel')?.value;
    if (!subject) return;

    state.quizSubject = subject;
    state.quizScore   = 0;
    state.quizCurrent = 0;

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:white;"></div> AI is generating questions...';

    try {
        const data = await apiPost('/api/quiz/generate', { subject, count: 5 });
        if (!data.quiz || data.quiz.length === 0) {
            throw new Error('No questions returned from AI.');
        }
        state.quizData = data.quiz;
        showToast(`✅ ${data.quiz.length} questions ready!`, 'success');
    } catch (err) {
        showToast(`Quiz generation failed: ${err.message}`, 'error');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>Try Again';
        return;
    }

    startQuizTimer(5 * 60);
    showQuestion();
}

function startQuizTimer(seconds) {
    state.quizSecondsLeft = seconds;
    if (state.quizTimerInterval) clearInterval(state.quizTimerInterval);
    state.quizTimerInterval = setInterval(() => {
        state.quizSecondsLeft--;
        const el = document.getElementById('quiz-timer-val');
        if (el) {
            const m = Math.floor(state.quizSecondsLeft / 60).toString().padStart(2, '0');
            const s = (state.quizSecondsLeft % 60).toString().padStart(2, '0');
            el.textContent = `${m}:${s}`;
            if (state.quizSecondsLeft <= 30) el.style.color = 'var(--error)';
        }
        if (state.quizSecondsLeft <= 0) {
            clearInterval(state.quizTimerInterval);
            state.quizTimerInterval = null;
            showQuizResults();
        }
    }, 1000);
}

function showQuestion() {
    const q      = state.quizData[state.quizCurrent];
    const total  = state.quizData.length;
    const pct    = (state.quizCurrent / total) * 100;
    const letters = ['A', 'B', 'C', 'D'];

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
    document.querySelectorAll('.quiz-option').forEach(el => el.classList.add('disabled'));
    const selectedEl = document.getElementById(`opt-${selected}`);
    const correctEl  = document.getElementById(`opt-${correct}`);

    if (selected === correct) {
        selectedEl?.classList.add('correct');
        state.quizScore++;
        showToast('Correct! 🎉', 'success');
    } else {
        selectedEl?.classList.add('wrong');
        correctEl?.classList.add('correct');
        showToast('Not quite — see the correct answer!', 'warning');
    }

    document.getElementById('quiz-score-badge').textContent = `Score: ${state.quizScore}/${state.quizData.length}`;
    const nb = document.getElementById('next-btn');
    if (nb) nb.style.display = 'flex';
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
    if (state.quizTimerInterval) { clearInterval(state.quizTimerInterval); state.quizTimerInterval = null; }

    const score = state.quizScore;
    const total = state.quizData.length;
    const pct   = Math.round((score / total) * 100);
    const grade = pct >= 80 ? '🏆 Excellent!' : pct >= 60 ? '👍 Good Job!' : pct >= 40 ? '📚 Keep Studying!' : '💪 Try Again!';
    const color = pct >= 80 ? 'var(--secondary)' : pct >= 60 ? 'var(--primary)' : pct >= 40 ? 'var(--tertiary)' : 'var(--error)';

    const body = document.getElementById('quiz-body');
    body.innerHTML = `
    <div class="quiz-layout animate-in" style="text-align:center;padding-top:48px;">
        <div style="width:120px;height:120px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;box-shadow:var(--shadow-3);">
            <span style="font-size:52px;font-weight:800;color:white;">${pct}%</span>
        </div>
        <h2 class="text-headline-lg" style="margin-bottom:8px;">${grade}</h2>
        <p class="text-body-lg text-on-surface-variant" style="margin-bottom:32px;">You scored <strong>${score}</strong> out of <strong>${total}</strong> on <strong>${state.quizSubject}</strong>.</p>

        <div class="grid grid-2" style="margin-bottom:32px;text-align:left;">
            <div class="card card-secondary">
                <h4 class="text-label-sm text-on-surface-variant" style="margin-bottom:8px;">CORRECT</h4>
                <div class="text-display-md text-secondary">${score}</div>
            </div>
            <div class="card" style="border-top-color:var(--error);">
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

    // Save progress to backend
    if (state.currentUser?.id) {
        apiPost('/api/quiz/submit', {
            student_id: state.currentUser.id,
            subject: state.quizSubject,
            score: pct,
            total_questions: total,
            correct_answers: score
        }).then(() => {
            // Refresh cached progress
            apiGet(`/api/progress/${state.currentUser.id}`)
                .then(d => { state.progressData = d.progress || []; })
                .catch(() => {});
        }).catch(() => {});
    }
}

function replayQuiz() {
    state.quizCurrent = 0;
    state.quizScore   = 0;
    loadQuiz();
}

// ── Progress ──────────────────────────────────────────────────
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

                <!-- Summary Cards -->
                <div class="grid grid-3 animate-in animate-in-delay-1" style="margin-bottom:32px;">
                    <div class="stat-card card-tertiary">
                        <div class="stat-card-header">
                            <span class="text-label-sm text-on-surface-variant">STREAK</span>
                            <div class="stat-card-icon" style="background:rgba(120,75,0,0.1);color:var(--tertiary);"><span class="material-symbols-outlined">local_fire_department</span></div>
                        </div>
                        <div class="stat-card-value text-tertiary" id="prog-streak">—</div>
                        <div class="stat-card-label">Best Streak 🔥</div>
                    </div>
                    <div class="stat-card card-primary">
                        <div class="stat-card-header">
                            <span class="text-label-sm text-on-surface-variant">QUIZZES</span>
                            <div class="stat-card-icon" style="background:rgba(0,74,198,0.1);color:var(--primary);"><span class="material-symbols-outlined">assignment_turned_in</span></div>
                        </div>
                        <div class="stat-card-value text-primary" id="prog-quizzes">—</div>
                        <div class="stat-card-label">Total Quizzes</div>
                    </div>
                    <div class="stat-card card-secondary">
                        <div class="stat-card-header">
                            <span class="text-label-sm text-on-surface-variant">AVG SCORE</span>
                            <div class="stat-card-icon" style="background:rgba(0,110,47,0.1);color:var(--secondary);"><span class="material-symbols-outlined">emoji_events</span></div>
                        </div>
                        <div class="stat-card-value text-secondary" id="prog-avg">—</div>
                        <div class="stat-card-label">Average Score</div>
                    </div>
                </div>

                <!-- Subject Mastery from Real Data -->
                <div class="animate-in animate-in-delay-2">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="section-title" style="margin:0;">Subject Mastery</h2>
                        <button class="btn btn-ghost btn-sm" onclick="loadProgressPage()">
                            <span class="material-symbols-outlined">refresh</span>Refresh
                        </button>
                    </div>
                    <div id="progress-mastery" style="display:flex;flex-direction:column;gap:16px;">
                        <div style="text-align:center;padding:20px;color:var(--on-surface-variant);">
                            <div class="spinner" style="margin:0 auto 8px;"></div>Loading...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    ${buildBottomNav('progress')}`;

    loadProgressPage();
}

async function loadProgressPage() {
    if (!state.currentUser?.id) return;
    try {
        const data = await apiGet(`/api/progress/${state.currentUser.id}`);
        state.progressData = data.progress || [];

        const streak   = state.progressData.reduce((m, r) => Math.max(m, r.streak), 0);
        const totalQ   = data.total_quizzes || 0;
        const avgScore = data.avg_score || 0;

        const elStreak  = document.getElementById('prog-streak');
        const elQuizzes = document.getElementById('prog-quizzes');
        const elAvg     = document.getElementById('prog-avg');
        if (elStreak)  elStreak.textContent  = streak;
        if (elQuizzes) elQuizzes.textContent = totalQ;
        if (elAvg)     elAvg.textContent     = avgScore ? `${avgScore}%` : '—';

        const masteryEl = document.getElementById('progress-mastery');
        if (!masteryEl) return;

        const SUBJECT_META = {
            'Mathematics':    { icon: 'calculate',   color: 'var(--primary)' },
            'Science':        { icon: 'science',      color: 'var(--secondary)' },
            'English':        { icon: 'history_edu',  color: 'var(--tertiary)' },
            'Tamil':          { icon: 'language',     color: '#6d28d9' },
            'Social Science': { icon: 'public',       color: '#0891b2' },
            'Computer Science': { icon: 'computer',   color: '#0f766e' },
        };

        if (state.progressData.length === 0) {
            masteryEl.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">school</span>
                <h3>No quiz history yet</h3>
                <p>Take some quizzes to see your subject mastery here!</p>
                <button class="btn btn-primary" onclick="navigate('quiz')">Take a Quiz</button>
            </div>`;
            return;
        }

        masteryEl.innerHTML = state.progressData.map(s => {
            const meta = SUBJECT_META[s.subject] || { icon: 'school', color: 'var(--primary)' };
            const pct  = Math.round(s.completion);
            return `
            <div class="flex items-center gap-4" style="background:var(--surface-container-lowest);padding:16px;border-radius:var(--r-md);box-shadow:var(--shadow-1);">
                <div style="width:52px;height:52px;border-radius:50%;background:conic-gradient(${meta.color} ${pct}%, var(--surface-container-high) 0);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <div style="width:36px;height:36px;background:var(--surface-container-lowest);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${pct}%</div>
                </div>
                <div style="flex:1;">
                    <div class="flex justify-between mb-2">
                        <strong>${s.subject}</strong>
                        <span class="text-label-sm text-on-surface-variant">${s.streak} quizzes completed</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${meta.color};"></div></div>
                </div>
                <button class="btn btn-sm btn-outlined" onclick="startSubjectQuiz('${s.subject}')">Practice</button>
            </div>`;
        }).join('');

    } catch (err) {
        const masteryEl = document.getElementById('progress-mastery');
        if (masteryEl) {
            masteryEl.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">cloud_off</span>
                <p>Could not load progress. ${err.message || 'Backend may be offline.'}</p>
                <button class="btn btn-outlined" onclick="loadProgressPage()">Retry</button>
            </div>`;
        }
    }
}

// ── Teacher Dashboard ─────────────────────────────────────────
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
                        <div class="stat-card-header"><span class="text-label-sm text-on-surface-variant">QUIZZES</span><div class="stat-card-icon" style="background:rgba(120,75,0,0.1);color:var(--tertiary);"><span class="material-symbols-outlined">assignment_turned_in</span></div></div>
                        <div class="stat-card-value text-tertiary" id="stat-quizzes">—</div>
                        <div class="stat-card-label">Total Quizzes Taken</div>
                    </div>
                    <div class="stat-card" style="border-top-color:var(--secondary);">
                        <div class="stat-card-header"><span class="text-label-sm text-on-surface-variant">QUESTIONS</span><div class="stat-card-icon" style="background:rgba(0,110,47,0.1);color:var(--secondary);"><span class="material-symbols-outlined">psychology</span></div></div>
                        <div class="stat-card-value text-secondary" id="stat-questions">—</div>
                        <div class="stat-card-label">AI Tutor Questions</div>
                    </div>
                </div>

                <!-- Upload + File List -->
                <div class="grid grid-12 animate-in animate-in-delay-2">
                    <div class="col-4">
                        <h2 class="section-title">Upload Textbook</h2>
                        <div class="upload-zone" id="upload-zone"
                             onclick="document.getElementById('pdf-input').click()"
                             ondragover="handleDragOver(event)"
                             ondragleave="handleDragLeave(event)"
                             ondrop="handleDrop(event)">
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
                            <button class="btn btn-ghost btn-sm" onclick="loadTeacherDocs()">
                                <span class="material-symbols-outlined">refresh</span>Refresh
                            </button>
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
        const elS = document.getElementById('stat-students');
        const elD = document.getElementById('stat-docs');
        const elQ = document.getElementById('stat-quizzes');
        const elQst = document.getElementById('stat-questions');
        if (elS) elS.textContent = data.students ?? '—';
        if (elD) elD.textContent = data.documents ?? '—';
        if (elQ) elQ.textContent = data.total_quizzes ?? '—';
        if (elQst) elQst.textContent = data.questions_asked ?? '—';
    } catch { /* ignore */ }
}

async function loadTeacherDocs() {
    const list = document.getElementById('docs-list');
    if (!list) return;
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--on-surface-variant);"><div class="spinner" style="margin:0 auto 12px;"></div>Loading...</div>`;
    try {
        const data = await apiGet('/api/documents');
        const docs = data.documents || [];
        if (docs.length === 0) {
            list.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">folder_open</span><p>No books uploaded yet.<br>Upload your first PDF to get started!</p></div>`;
            return;
        }
        list.innerHTML = docs.map(doc => {
            const statusBadge = {
                indexed:  `<span class="badge badge-secondary"><span class="material-symbols-outlined" style="font-size:14px;">check_circle</span>Indexed</span>`,
                indexing: `<span class="badge badge-warning"><span class="material-symbols-outlined" style="font-size:14px;">sync</span>Indexing...</span>`,
                pending:  `<span class="badge badge-warning"><span class="material-symbols-outlined" style="font-size:14px;">hourglass_empty</span>Pending</span>`,
                error:    `<span class="badge badge-error"><span class="material-symbols-outlined" style="font-size:14px;">error</span>Error</span>`,
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
                <button class="btn-icon" onclick="deleteDoc(${doc.id})" title="Delete document">
                    <span class="material-symbols-outlined" style="color:var(--error);">delete</span>
                </button>
            </div>`;
        }).join('');
    } catch {
        list.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">cloud_off</span><p>Cannot reach server.<br>Make sure the backend is running.</p></div>`;
    }
}

// ── Upload Handlers ───────────────────────────────────────────
function handleDragOver(e)  { e.preventDefault(); document.getElementById('upload-zone')?.classList.add('dragging'); }
function handleDragLeave()  { document.getElementById('upload-zone')?.classList.remove('dragging'); }
function handleDrop(e) {
    e.preventDefault();
    document.getElementById('upload-zone')?.classList.remove('dragging');
    const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
    if (files.length) queueUploads(files);
    else showToast('Only PDF files are accepted.', 'warning');
}
function handleFileSelect(e) {
    const files = [...e.target.files].filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length) queueUploads(files);
    // Reset input so same file can be re-selected
    e.target.value = '';
}

function queueUploads(files) {
    files.forEach(file => {
        showModal('Choose Subject', `
            <p class="text-body-md" style="margin-bottom:16px;"><strong>${file.name}</strong></p>
            <div class="form-group">
                <label class="form-label">Assign to Subject</label>
                <div class="input-wrap">
                    <span class="material-symbols-outlined input-icon">category</span>
                    <input type="text" id="modal-subject" class="input-field" placeholder="E.g. Mathematics, History, etc." list="subjects-list">
                    <datalist id="subjects-list">
                        ${state.subjectsList.map(s => `<option value="${s}">`).join('')}
                    </datalist>
                </div>
            </div>`,
            `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="uploadFile()">Upload & Index</button>`
        );
        window._pendingFile = file;
    });
}

async function uploadFile() {
    const subject = document.getElementById('modal-subject')?.value || 'General';
    const file    = window._pendingFile;
    closeModal();
    if (!file) return;

    const itemId  = `upload-${Date.now()}`;
    const pending = document.getElementById('pending-files');
    if (pending) {
        pending.insertAdjacentHTML('beforeend', `
        <div id="${itemId}" class="file-list-item">
            <div class="file-icon" style="background:rgba(0,74,198,0.1);color:var(--primary);"><span class="material-symbols-outlined">picture_as_pdf</span></div>
            <div style="flex:1;">
                <div style="font-weight:600;font-size:13px;">${file.name}</div>
                <div style="font-size:12px;color:var(--on-surface-variant);">${subject} — uploading...</div>
            </div>
            <div class="spinner"></div>
        </div>`);
    }

    try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('subject', subject);
        const res = await apiUpload('/api/upload', fd);
        showToast(`✅ "${file.name}" indexed successfully!`, 'success');
        document.getElementById(itemId)?.remove();
        await loadTeacherDocs();
        await loadTeacherStats();
    } catch (err) {
        showToast(`Upload failed: ${err.message}`, 'error');
        const el = document.getElementById(itemId);
        if (el) {
            el.querySelector('.spinner')?.remove();
            el.insertAdjacentHTML('beforeend', `<span class="badge badge-error">Failed</span>`);
        }
    }
}

async function deleteDoc(id) {
    if (!confirm('Delete this document from the knowledge base?')) return;
    try {
        await apiPost('/api/documents/delete', { doc_id: id });
        showToast('Document deleted', 'info');
        await loadTeacherDocs();
        await loadTeacherStats();
    } catch {
        showToast('Could not delete document', 'error');
    }
}

// ── Service Worker ────────────────────────────────────────────
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('[EduMentor] Service Worker registered'))
            .catch(err => console.warn('[EduMentor] SW registration failed:', err));
    }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => navigate('welcome'), 800);
    registerSW();
});
