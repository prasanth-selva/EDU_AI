const templates = {
    welcome: `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
            <div style="position: absolute; top: 20px; right: 20px;">
                <div style="background: var(--surface); padding: 8px 16px; border-radius: 999px; border: 1px solid var(--outline-variant); display: flex; align-items: center; gap: 8px;">
                    <span class="material-symbols-outlined text-primary">language</span>
                    <select style="border: none; background: transparent; font-weight: 600; outline: none; cursor: pointer;">
                        <option value="en">English</option>
                        <option value="ta">Tamil</option>
                    </select>
                </div>
            </div>
            
            <div class="animate-fade-in-up" style="text-align: center; max-width: 600px; padding: 24px;">
                <span class="material-symbols-outlined text-primary" style="font-size: 80px; margin-bottom: 24px;">school</span>
                <h1 class="text-display-md" style="margin-bottom: 16px;">Welcome to <span class="text-primary">Edu Mentor AI</span></h1>
                <p class="text-body-lg text-on-surface-variant" style="margin-bottom: 48px;">Learn Anything. Anytime. Even Without Internet.</p>
                
                <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="navigate('login')">
                        Start Learning <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                    <button class="btn btn-secondary" onclick="navigate('teacher_login')">
                        Teacher Login
                    </button>
                </div>
            </div>
        </div>
    `,
    login: `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px;">
            <div style="background: var(--surface-container-lowest); padding: 48px; border-radius: var(--radius-xl); box-shadow: var(--shadow-level-1); border-top: 4px solid var(--primary); width: 100%; max-width: 400px; text-align: center;">
                <span class="material-symbols-outlined text-primary" style="font-size: 64px; margin-bottom: 16px;">face</span>
                <h2 class="text-headline-lg" style="margin-bottom: 8px;">Student Login</h2>
                <p class="text-body-md text-on-surface-variant" style="margin-bottom: 32px;">Ready to learn? Let's go!</p>
                
                <form id="loginForm" onsubmit="event.preventDefault(); handleLogin();" style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="input-group">
                        <span class="material-symbols-outlined input-icon">person</span>
                        <input type="text" id="studentName" class="input-field" placeholder="What's your name?" required>
                    </div>
                    
                    <div class="input-group">
                        <span class="material-symbols-outlined input-icon">auto_stories</span>
                        <select id="studentClass" class="input-field" required>
                            <option value="" disabled selected>Select your class</option>
                            <option value="1">1st Grade</option>
                            <option value="2">2nd Grade</option>
                            <option value="3">3rd Grade</option>
                            <option value="4">4th Grade</option>
                            <option value="5">5th Grade</option>
                            <option value="6">6th Grade</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="margin-top: 16px; width: 100%;">
                        Let's Go! <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                </form>
            </div>
        </div>
    `,
    dashboard: `
        <div class="dashboard-layout">
            <nav class="sidebar">
                <div style="margin-bottom: 32px; padding: 0 16px;">
                    <h1 class="text-headline-md text-primary">EduMentor</h1>
                </div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <a href="javascript:void(0)" onclick="navigate('dashboard')" class="sidebar-link active">
                        <span class="material-symbols-outlined">dashboard</span> Dashboard
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('subjects')" class="sidebar-link">
                        <span class="material-symbols-outlined">auto_stories</span> Subjects
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('ai_tutor')" class="sidebar-link">
                        <span class="material-symbols-outlined">psychology</span> AI Tutor
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('quiz')" class="sidebar-link">
                        <span class="material-symbols-outlined">assignment</span> Quizzes
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('progress')" class="sidebar-link">
                        <span class="material-symbols-outlined">trending_up</span> Progress
                    </a>
                </div>
            </nav>
            
            <div class="main-content">
                <header class="topbar">
                    <h2 class="text-headline-md" id="welcomeUser">Good Morning 👋</h2>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span class="material-symbols-outlined" style="cursor: pointer;">notifications</span>
                        <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;" id="userInitial">U</div>
                    </div>
                </header>
                
                <div class="dashboard-canvas">
                    <div style="background: var(--primary-container); color: var(--on-primary-container); padding: 48px; border-radius: var(--radius-xl); margin-bottom: 32px;">
                        <h3 class="text-display-md" style="margin-bottom: 12px;">What would you like to learn today?</h3>
                        <p class="text-body-lg" style="opacity: 0.9; margin-bottom: 24px;">Dive back into your subjects or let the AI guide your next step.</p>
                        <button class="btn" style="background: var(--surface); color: var(--primary);" onclick="navigate('ai_tutor')">
                            Ask AI Tutor
                        </button>
                    </div>
                    
                    <div class="grid-cards">
                        <a href="javascript:void(0)" onclick="navigate('ai_tutor')" class="card card-primary col-8">
                            <div style="display: flex; justify-content: space-between;">
                                <div class="card-icon-wrap"><span class="material-symbols-outlined" style="font-size: 32px;">smart_toy</span></div>
                                <span class="material-symbols-outlined">arrow_outward</span>
                            </div>
                            <h4 class="text-headline-lg">Ask AI Tutor</h4>
                            <p class="text-body-md text-on-surface-variant">Get instant offline help and explanations.</p>
                        </a>
                        
                        <a href="javascript:void(0)" onclick="navigate('subjects')" class="card card-secondary col-4">
                            <div class="card-icon-wrap"><span class="material-symbols-outlined" style="font-size: 32px;">library_books</span></div>
                            <h4 class="text-headline-md">My Subjects</h4>
                            <p class="text-body-md text-on-surface-variant">Continue your lessons.</p>
                        </a>
                        
                        <a href="javascript:void(0)" onclick="navigate('quiz')" class="card col-4" style="border-top-color: var(--tertiary);">
                            <div class="card-icon-wrap" style="background: rgba(120,75,0,0.1); color: var(--tertiary);"><span class="material-symbols-outlined" style="font-size: 32px;">assignment</span></div>
                            <h4 class="text-headline-md">Quizzes</h4>
                            <p class="text-body-md text-on-surface-variant">Test your knowledge.</p>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `,
    ai_tutor: `
        <div class="dashboard-layout">
            <nav class="sidebar">
                <div style="margin-bottom: 32px; padding: 0 16px;">
                    <h1 class="text-headline-md text-primary" style="cursor:pointer;" onclick="navigate('dashboard')">EduMentor</h1>
                </div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <a href="javascript:void(0)" onclick="navigate('dashboard')" class="sidebar-link">
                        <span class="material-symbols-outlined">dashboard</span> Dashboard
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('ai_tutor')" class="sidebar-link active">
                        <span class="material-symbols-outlined">psychology</span> AI Tutor
                    </a>
                </div>
            </nav>
            
            <div class="main-content">
                <header class="topbar">
                    <h2 class="text-headline-md">AI Tutor</h2>
                </header>
                
                <div class="dashboard-canvas">
                    <div class="chat-container">
                        <div class="chat-messages" id="chatMessages">
                            <div class="chat-bubble ai">
                                Hello! I'm your offline AI Tutor. You can ask me questions about your subjects, or ask me to explain topics from your textbooks.
                            </div>
                        </div>
                        <form class="chat-input-area" onsubmit="event.preventDefault(); sendMessage();">
                            <input type="text" id="chatInput" class="chat-input" placeholder="Ask me anything..." required>
                            <button type="submit" class="chat-send-btn">
                                <span class="material-symbols-outlined">send</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `,
    teacher_login: `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px;">
            <div style="background: var(--surface-container-lowest); padding: 48px; border-radius: var(--radius-xl); box-shadow: var(--shadow-level-1); border-top: 4px solid var(--secondary); width: 100%; max-width: 400px; text-align: center;">
                <span class="material-symbols-outlined text-secondary" style="font-size: 64px; margin-bottom: 16px;">school</span>
                <h2 class="text-headline-lg" style="margin-bottom: 8px;">Teacher Login</h2>
                <p class="text-body-md text-on-surface-variant" style="margin-bottom: 32px;">Manage your classroom.</p>
                
                <form onsubmit="event.preventDefault(); navigate('teacher_dashboard');" style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="input-group">
                        <span class="material-symbols-outlined input-icon">person</span>
                        <input type="text" class="input-field" placeholder="Username" required>
                    </div>
                    <div class="input-group">
                        <span class="material-symbols-outlined input-icon">lock</span>
                        <input type="password" class="input-field" placeholder="Password" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="margin-top: 16px; width: 100%; background: var(--secondary); border-bottom-color: #005321;">
                        Login <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                    <button type="button" class="btn" style="background: transparent; color: var(--primary);" onclick="navigate('login')">
                        I am a student
                    </button>
                </form>
            </div>
        </div>
    `,
    teacher_dashboard: `
        <div class="dashboard-layout">
            <nav class="sidebar">
                <div style="margin-bottom: 32px; padding: 0 16px;">
                    <h1 class="text-headline-md text-secondary" style="cursor:pointer;" onclick="navigate('welcome')">EduMentor</h1>
                </div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <a href="javascript:void(0)" class="sidebar-link active" style="background: var(--secondary-container); color: var(--on-secondary-container);">
                        <span class="material-symbols-outlined">dashboard</span> Overview
                    </a>
                </div>
            </nav>
            <div class="main-content">
                <header class="topbar">
                    <h2 class="text-headline-md">Teacher Dashboard</h2>
                </header>
                <div class="dashboard-canvas">
                    <div class="grid-cards" style="margin-bottom: 32px;">
                        <div class="card col-4" style="border-top-color: var(--primary);">
                            <h4 class="text-label-lg text-on-surface-variant">Student Count</h4>
                            <div class="text-display-md mt-2">142</div>
                        </div>
                        <div class="card col-4" style="border-top-color: var(--secondary);">
                            <h4 class="text-label-lg text-on-surface-variant">Uploaded PDFs</h4>
                            <div class="text-display-md mt-2">28</div>
                        </div>
                        <div class="card col-4" style="border-top-color: var(--error);">
                            <h4 class="text-label-lg text-on-surface-variant">Weak Chapters</h4>
                            <div class="text-display-md mt-2">3</div>
                        </div>
                    </div>
                    
                    <h3 class="text-headline-md mb-4">Quick Upload</h3>
                    <div style="border: 2px dashed var(--outline-variant); border-radius: var(--radius-xl); padding: 48px; text-align: center; background: var(--surface-container-lowest);">
                        <span class="material-symbols-outlined text-outline" style="font-size: 48px; margin-bottom: 16px;">cloud_upload</span>
                        <p class="text-body-lg">Drag & Drop Samacheer PDFs here</p>
                        <button class="btn btn-secondary mt-4">Browse Files</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    subjects: `
        <div class="dashboard-layout">
            <nav class="sidebar">
                <div style="margin-bottom: 32px; padding: 0 16px;">
                    <h1 class="text-headline-md text-primary" style="cursor:pointer;" onclick="navigate('dashboard')">EduMentor</h1>
                </div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <a href="javascript:void(0)" onclick="navigate('dashboard')" class="sidebar-link">
                        <span class="material-symbols-outlined">dashboard</span> Dashboard
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('subjects')" class="sidebar-link active">
                        <span class="material-symbols-outlined">auto_stories</span> Subjects
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('ai_tutor')" class="sidebar-link">
                        <span class="material-symbols-outlined">psychology</span> AI Tutor
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('quiz')" class="sidebar-link">
                        <span class="material-symbols-outlined">assignment</span> Quizzes
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('progress')" class="sidebar-link">
                        <span class="material-symbols-outlined">trending_up</span> Progress
                    </a>
                </div>
            </nav>
            <div class="main-content">
                <header class="topbar"><h2 class="text-headline-md">My Subjects</h2></header>
                <div class="dashboard-canvas">
                    <div class="grid-cards">
                        <div class="card col-4" style="border-top-color: var(--primary);">
                            <div class="card-icon-wrap" style="background: rgba(37,99,235,0.1); color: var(--primary);"><span class="material-symbols-outlined" style="font-size: 32px;">calculate</span></div>
                            <h3 class="text-headline-md mb-2">Mathematics</h3>
                            <div style="height: 8px; background: var(--surface-container); border-radius: 4px; margin: 16px 0;"><div style="height: 100%; width: 65%; background: var(--secondary); border-radius: 4px;"></div></div>
                            <button class="btn btn-primary mt-4" style="width: 100%;" onclick="navigate('quiz')">Continue</button>
                        </div>
                        <div class="card col-4" style="border-top-color: var(--secondary);">
                            <div class="card-icon-wrap" style="background: rgba(107,255,143,0.2); color: var(--secondary);"><span class="material-symbols-outlined" style="font-size: 32px;">science</span></div>
                            <h3 class="text-headline-md mb-2">Science</h3>
                            <div style="height: 8px; background: var(--surface-container); border-radius: 4px; margin: 16px 0;"><div style="height: 100%; width: 30%; background: var(--secondary); border-radius: 4px;"></div></div>
                            <button class="btn btn-primary mt-4" style="width: 100%;" onclick="navigate('quiz')">Continue</button>
                        </div>
                        <div class="card col-4" style="border-top-color: var(--tertiary);">
                            <div class="card-icon-wrap" style="background: rgba(120,75,0,0.1); color: var(--tertiary);"><span class="material-symbols-outlined" style="font-size: 32px;">history_edu</span></div>
                            <h3 class="text-headline-md mb-2">English</h3>
                            <div style="height: 8px; background: var(--surface-container); border-radius: 4px; margin: 16px 0;"><div style="height: 100%; width: 0%; background: var(--secondary); border-radius: 4px;"></div></div>
                            <button class="btn btn-primary mt-4" style="width: 100%; background: var(--surface-container-high); color: var(--on-surface); border: none;">Start</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    quiz: `
        <div class="dashboard-layout">
            <div class="main-content" style="margin-left: 0;">
                <header class="topbar" style="justify-content: center; position: relative;">
                    <button class="btn" style="position: absolute; left: 24px; padding: 0;" onclick="navigate('subjects')">
                        <span class="material-symbols-outlined">close</span> Exit Quiz
                    </button>
                    <div style="display: flex; align-items: center; gap: 8px; background: rgba(120,75,0,0.1); padding: 8px 16px; border-radius: 999px; color: var(--tertiary);">
                        <span class="material-symbols-outlined">timer</span>
                        <span class="text-headline-md">02:45</span>
                    </div>
                </header>
                <div class="dashboard-canvas" style="max-width: 800px; padding-top: 48px;">
                    <div style="margin-bottom: 32px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span class="text-label-lg text-on-surface-variant">Question 3 of 10</span>
                        </div>
                        <div style="height: 8px; background: var(--surface-container); border-radius: 4px;"><div style="height: 100%; width: 30%; background: var(--secondary); border-radius: 4px;"></div></div>
                    </div>
                    <div class="card" style="margin-bottom: 32px; padding: 32px;">
                        <h2 class="text-headline-lg">What is the process by which plants convert sunlight into energy?</h2>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <button class="btn" style="justify-content: flex-start; padding: 24px; border: 2px solid var(--surface-container-highest); background: var(--surface); color: var(--on-surface); font-size: 18px;" onclick="this.style.borderColor='var(--error)'; this.style.backgroundColor='var(--error-container)';">
                            <span style="width: 40px; height: 40px; border-radius: 50%; background: var(--surface-container); display: flex; align-items: center; justify-content: center; margin-right: 16px; font-weight: bold;">A</span>
                            Respiration
                        </button>
                        <button class="btn" style="justify-content: flex-start; padding: 24px; border: 2px solid var(--surface-container-highest); background: var(--surface); color: var(--on-surface); font-size: 18px;" onclick="this.style.borderColor='var(--secondary)'; this.style.backgroundColor='var(--secondary-container)'; setTimeout(() => alert('Correct!'), 500);">
                            <span style="width: 40px; height: 40px; border-radius: 50%; background: var(--surface-container); display: flex; align-items: center; justify-content: center; margin-right: 16px; font-weight: bold;">B</span>
                            Photosynthesis
                        </button>
                        <button class="btn" style="justify-content: flex-start; padding: 24px; border: 2px solid var(--surface-container-highest); background: var(--surface); color: var(--on-surface); font-size: 18px;" onclick="this.style.borderColor='var(--error)'; this.style.backgroundColor='var(--error-container)';">
                            <span style="width: 40px; height: 40px; border-radius: 50%; background: var(--surface-container); display: flex; align-items: center; justify-content: center; margin-right: 16px; font-weight: bold;">C</span>
                            Transpiration
                        </button>
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 32px;">
                        <button class="btn btn-primary" onclick="navigate('progress')">Finish Quiz <span class="material-symbols-outlined">arrow_forward</span></button>
                    </div>
                </div>
            </div>
        </div>
    `,
    progress: `
        <div class="dashboard-layout">
            <nav class="sidebar">
                <div style="margin-bottom: 32px; padding: 0 16px;">
                    <h1 class="text-headline-md text-primary" style="cursor:pointer;" onclick="navigate('dashboard')">EduMentor</h1>
                </div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <a href="javascript:void(0)" onclick="navigate('dashboard')" class="sidebar-link">
                        <span class="material-symbols-outlined">dashboard</span> Dashboard
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('subjects')" class="sidebar-link">
                        <span class="material-symbols-outlined">auto_stories</span> Subjects
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('ai_tutor')" class="sidebar-link">
                        <span class="material-symbols-outlined">psychology</span> AI Tutor
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('quiz')" class="sidebar-link">
                        <span class="material-symbols-outlined">assignment</span> Quizzes
                    </a>
                    <a href="javascript:void(0)" onclick="navigate('progress')" class="sidebar-link active">
                        <span class="material-symbols-outlined">trending_up</span> Progress
                    </a>
                </div>
            </nav>
            <div class="main-content">
                <header class="topbar"><h2 class="text-headline-md">Your Progress</h2></header>
                <div class="dashboard-canvas">
                    <div class="card" style="border-top-color: var(--tertiary); margin-bottom: 32px;">
                        <h3 class="text-headline-lg">"Great things never come from comfort zones."</h3>
                        <p class="text-body-lg text-on-surface-variant">You're doing amazing! Keep pushing forward.</p>
                    </div>
                    
                    <div class="grid-cards">
                        <div class="card col-6" style="border-top-color: var(--secondary);">
                            <h4 class="text-label-lg text-on-surface-variant">Daily Goal</h4>
                            <div class="text-display-md mt-2">45 / 60 Min</div>
                            <div style="height: 16px; background: var(--surface-container); border-radius: 8px; margin-top: 16px;"><div style="height: 100%; width: 75%; background: var(--secondary); border-radius: 8px;"></div></div>
                        </div>
                        <div class="card col-6" style="border-top-color: var(--primary);">
                            <h4 class="text-label-lg text-on-surface-variant">Learning Streak</h4>
                            <div class="text-display-md mt-2">12 Days</div>
                            <div style="display: flex; gap: 8px; margin-top: 16px;">
                                <div style="width: 24px; height: 24px; background: var(--primary); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 16px;">check</span></div>
                                <div style="width: 24px; height: 24px; background: var(--primary); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 16px;">check</span></div>
                                <div style="width: 24px; height: 24px; background: var(--primary); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 16px;">check</span></div>
                                <div style="width: 24px; height: 24px; background: var(--primary-container); border-radius: 50%; color: var(--on-primary-container); display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 16px;">local_fire_department</span></div>
                                <div style="width: 24px; height: 24px; background: var(--surface-container); border-radius: 50%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

let currentUser = null;

function navigate(page) {
    const app = document.getElementById('app');
    if (templates[page]) {
        app.innerHTML = templates[page];
        
        if (page === 'dashboard' && currentUser) {
            document.getElementById('welcomeUser').innerText = `Good Morning, ${currentUser.name} 👋`;
            document.getElementById('userInitial').innerText = currentUser.name.charAt(0).toUpperCase();
        }
    } else {
        app.innerHTML = '<h2>404 - Page not found</h2>';
    }
}

function handleLogin() {
    const name = document.getElementById('studentName').value;
    const grade = document.getElementById('studentClass').value;
    
    if (name && grade) {
        currentUser = { name, grade };
        // In real app, call /api/student/register
        navigate('dashboard');
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const msgText = input.value.trim();
    if (!msgText) return;
    
    const messagesContainer = document.getElementById('chatMessages');
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-bubble user animate-fade-in-up';
    userMsg.innerText = msgText;
    messagesContainer.appendChild(userMsg);
    
    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add typing indicator
    const aiMsg = document.createElement('div');
    aiMsg.className = 'chat-bubble ai animate-fade-in-up';
    aiMsg.innerText = 'Thinking...';
    messagesContainer.appendChild(aiMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    try {
        // Mock API call to backend
        const response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: msgText, student_id: 1 })
        });
        
        if (response.ok) {
            const data = await response.json();
            aiMsg.innerText = data.answer;
        } else {
            // Mock offline response for now
            setTimeout(() => {
                aiMsg.innerText = `This is a simulated offline answer from Ollama about "${msgText}". When the backend is running, this will fetch from /api/ask.`;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 1000);
        }
    } catch (e) {
        // Fallback simulated answer
        setTimeout(() => {
            aiMsg.innerText = `This is a simulated offline answer from Ollama about "${msgText}". When the backend is running, this will fetch from /api/ask.`;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 1000);
    }
}

// Init app
document.addEventListener('DOMContentLoaded', () => {
    navigate('welcome');
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
            console.log('ServiceWorker registration successful');
        }).catch((err) => {
            console.log('ServiceWorker registration failed: ', err);
        });
    }
});
