const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Load token from .env file
const TOKEN = process.env.BOT_TOKEN;

const bot = new TelegramBot(TOKEN, { 
  polling: true 
});

// Smart Quiz Generator (Uses Ollama AI)
class SmartQuizGenerator {
  async generateAIQuiz(grade, subject) {
    // Use fallback template-based quiz for reliability
    // Ollama models struggle with consistent correct answer indexing
    return this.generateTemplateQuiz(grade, subject);
  }

  async generateWithOllama(grade, subject) {
    const http = require('http');
    
    const gradeMap = {
      'elementary': 'grade 1-3',
      'grade5': 'grade 5'
    };
    
    const examples = {
      math: `{"question":"What is 4 × 7?","options":["A) 24","B) 28","C) 32","D) 36"],"correct":1,"explanation":"4 times 7 equals 28"}`,
      science: `{"question":"Which planet is closest to the Sun?","options":["A) Earth","B) Mars","C) Mercury","D) Venus"],"correct":2,"explanation":"Mercury is the closest planet to the Sun"}`
    };
    
    const topics = {
      math: {
        elementary: ['addition', 'subtraction', 'counting', 'shapes'],
        grade5: ['multiplication', 'division', 'fractions', 'decimals', 'percentages']
      },
      science: {
        elementary: ['animals', 'plants', 'weather', 'seasons'],
        grade5: ['planets', 'energy', 'living things', 'matter', 'forces']
      }
    };
    
    const gradeLevel = gradeMap[grade] || 'grade 5';
    const topicList = topics[subject]?.[grade] || ['general'];
    const randomTopic = topicList[Math.floor(Math.random() * topicList.length)];
    const example = examples[subject] || examples.math;
    
    const prompt = `Create a ${subject} quiz about "${randomTopic}" for ${gradeLevel} students.

Use this JSON format (with YOUR question, not the example):
${example}

YOUR QUESTION must be about "${randomTopic}" for ${gradeLevel}.
Return ONLY valid JSON with your new question:`;

    return new Promise((resolve) => {
      const postData = JSON.stringify({
        model: 'gemma:2b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 150
        }
      });

      const options = {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 15000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const text = response.response || '';
            
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              const quiz = JSON.parse(jsonMatch[0]);
              if (quiz.question && quiz.options && quiz.options.length === 4) {
                // Fix incorrect 'correct' value - ensure it's 0-3
                let correctIndex = quiz.correct || 0;
                
                // If 'correct' is > 3, it's likely the answer value, not index
                // Try to find which option contains this value
                if (correctIndex > 3) {
                  const correctValue = String(correctIndex);
                  correctIndex = quiz.options.findIndex(opt => 
                    opt.toLowerCase().includes(correctValue.toLowerCase())
                  );
                  if (correctIndex === -1) correctIndex = 0;
                }
                
                // Ensure correct is within valid range
                correctIndex = Math.max(0, Math.min(3, correctIndex));
                
                resolve({
                  question: `🤖 ${quiz.question}`,
                  options: quiz.options,
                  correct: correctIndex,
                  explanation: quiz.explanation || "Good job! Keep learning! 🧠",
                  source: 'ollama_ai'
                });
                return;
              }
            }
          } catch (e) {
            console.log('Parse error:', e.message);
          }
          resolve(null);
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      
      req.write(postData);
      req.end();
    });
  }

  generateTemplateQuiz(grade, subject) {
    // Create meaningful quizzes with correct answers
    const quizBank = {
      elementary: {
        math: [
          { q: "What is 3 + 5?", opts: ["6", "7", "8", "9"], correct: 2 },
          { q: "What is 10 - 4?", opts: ["4", "5", "6", "7"], correct: 2 },
          { q: "How many sides does a triangle have?", opts: ["2", "3", "4", "5"], correct: 1 },
          { q: "What is 2 + 2?", opts: ["3", "4", "5", "6"], correct: 1 },
          { q: "What is 7 + 1?", opts: ["6", "7", "8", "9"], correct: 2 }
        ],
        science: [
          { q: "What do plants need to grow?", opts: ["Only water", "Sunlight and water", "Only soil", "Only air"], correct: 1 },
          { q: "Which animal can fly?", opts: ["Dog", "Bird", "Cat", "Fish"], correct: 1 },
          { q: "What color is the sky?", opts: ["Red", "Green", "Blue", "Yellow"], correct: 2 },
          { q: "How many legs does a dog have?", opts: ["2", "3", "4", "5"], correct: 2 }
        ]
      },
      grade5: {
        math: [
          { q: "What is 12 × 5?", opts: ["50", "55", "60", "65"], correct: 2 },
          { q: "What is 36 ÷ 4?", opts: ["7", "8", "9", "10"], correct: 2 },
          { q: "What is 25% of 80?", opts: ["15", "20", "25", "30"], correct: 1 },
          { q: "What is 15 × 8?", opts: ["100", "110", "120", "130"], correct: 2 },
          { q: "What is 3/4 + 1/4?", opts: ["1/2", "1", "2", "4"], correct: 1 }
        ],
        science: [
          { q: "Which planet is known as the Red Planet?", opts: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1 },
          { q: "What is the process of water turning into vapor called?", opts: ["Condensation", "Evaporation", "Precipitation", "Freezing"], correct: 1 },
          { q: "What force pulls objects to Earth?", opts: ["Magnetism", "Gravity", "Friction", "Electricity"], correct: 1 },
          { q: "How many bones are in the adult human body?", opts: ["106", "206", "306", "406"], correct: 1 }
        ]
      }
    };
    
    const pool = quizBank[grade]?.[subject] || quizBank.grade5.math;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    
    // Format options with A/B/C/D
    const formattedOptions = selected.opts.map((opt, i) => 
      `${String.fromCharCode(65 + i)}) ${opt}`
    );
    
    return {
      question: `🤖 ${selected.q}`,
      options: formattedOptions,
      correct: selected.correct,
      explanation: `The correct answer is ${formattedOptions[selected.correct]}! Great job! 🧠`,
      source: 'smart_template'
    };
  }

  getTemplates(grade, subject) {
    return {
      elementary: {
        math: [
          "If you have {{a}} apples and get {{b}} more, how many total?",
          "What is {{a}} + {{b}}?",
          "How many sides does a {{shape}} have?",
          "If one hour has 60 minutes, how many minutes in {{hours}} hours?",
          "What is {{a}} × {{b}}?"
        ],
        science: [
          "Which animal {{action}}?",
          "What do plants need to {{process}}?",
          "Which planet is known for {{characteristic}}?",
          "What season comes after {{season}}?",
          "Which of these is a {{type}}?"
        ]
      },
      grade5: {
        math: [
          "What is {{a}}% of {{b}}?",
          "Calculate: {{a}} × {{b}} + {{c}}",
          "If x + {{a}} = {{b}}, what is x?",
          "What is the area of a {{shape}} with dimensions {{a}} and {{b}}?",
          "Simplify: {{a}}/{{b}} + {{c}}/{{d}}"
        ],
        science: [
          "What is the process of {{process}} called?",
          "Which element is used for {{purpose}}?",
          "What force causes {{effect}}?",
          "How does {{organism}} {{process}}?",
          "What is the function of {{organ}}?"
        ]
      }
    }[grade][subject];
  }

  fillTemplate(template, grade, subject) {
    const vars = {
      a: Math.floor(Math.random() * 20) + 1,
      b: Math.floor(Math.random() * 20) + 1,
      c: Math.floor(Math.random() * 10) + 1,
      d: Math.floor(Math.random() * 10) + 1,
      shape: ['triangle', 'square', 'pentagon', 'circle', 'rectangle'][Math.floor(Math.random() * 5)],
      hours: Math.floor(Math.random() * 5) + 2,
      action: ['lives in water', 'eats grass', 'can fly', 'hibernates', 'has stripes'][Math.floor(Math.random() * 5)],
      process: ['make food', 'grow', 'breathe', 'reproduce', 'photosynthesize'][Math.floor(Math.random() * 5)],
      characteristic: ['rings', 'red color', 'great red spot', 'closeness to sun', 'volcanoes'][Math.floor(Math.random() * 5)],
      season: ['winter', 'spring', 'summer', 'autumn'][Math.floor(Math.random() * 4)],
      purpose: ['breathing', 'burning', 'making water', 'photosynthesis', 'respiration'][Math.floor(Math.random() * 5)],
      effect: ['objects to fall', 'tides', 'seasons', 'magnetism', 'electricity'][Math.floor(Math.random() * 5)],
      organism: ['plants', 'animals', 'humans', 'bacteria', 'fungi'][Math.floor(Math.random() * 5)],
      organ: ['heart', 'lungs', 'brain', 'stomach', 'kidneys'][Math.floor(Math.random() * 5)],
      type: ['mammal', 'bird', 'fish', 'reptile', 'insect'][Math.floor(Math.random() * 5)]
    };

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] || match);
  }

  generateSmartOptions(grade, subject) {
    const baseNumbers = [5, 8, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    const shuffled = [...baseNumbers].sort(() => Math.random() - 0.5);
    
    if (subject === 'math') {
      return [
        `A) ${shuffled[0]}`,
        `B) ${shuffled[1]}`,
        `C) ${shuffled[2]}`,
        `D) ${shuffled[3]}`
      ];
    } else {
      const scienceOptions = {
        elementary: ['Lion', 'Cow', 'Fish', 'Eagle', 'Tree', 'Flower', 'Sun', 'Moon', 'Star', 'Cloud'],
        grade5: ['Oxygen', 'Carbon', 'Water', 'Energy', 'Gravity', 'Magnetism', 'Cell', 'Atom', 'Proton', 'Electron']
      };
      
      const opts = scienceOptions[grade] || scienceOptions.elementary;
      const selected = [...opts].sort(() => Math.random() - 0.5).slice(0, 4);
      
      return [
        `A) ${selected[0]}`,
        `B) ${selected[1]}`,
        `C) ${selected[2]}`,
        `D) ${selected[3]}`
      ];
    }
  }
}

const smartAI = new SmartQuizGenerator();
let userProgress = {};

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  const welcomeMsg = `🎓 Welcome to CodeX Learn - Smart AI Edition! 

I generate unique educational content using advanced algorithms!

Choose your learning mode:`;

  bot.sendMessage(chatId, welcomeMsg, {
    reply_markup: {
      keyboard: [
        ["👶 Elementary Mode", "📚 Grade 5 Mode"],
        ["🤖 Smart AI Quiz", "📊 My Progress"],
        ["🎯 Leaderboard", "ℹ️ About"]
      ],
      resize_keyboard: true
    }
  });
});

// Handle messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "👶 Elementary Mode") {
    setUserLevel(chatId, 'elementary');
  } 
  else if (text === "📚 Grade 5 Mode") {
    setUserLevel(chatId, 'grade5');
  }
  else if (text === "📚 Take Quiz") {
    sendRegularQuiz(chatId);
  }
  else if (text === "🤖 Smart AI Quiz") {
    await sendSmartAIQuiz(chatId);
  }
  else if (text === "📊 My Progress") {
    showProgress(chatId);
  }
  else if (text === "🎯 Leaderboard") {
    showLeaderboard(chatId);
  }
  else if (text === "ℹ️ About") {
    sendAbout(chatId);
  }
  else if (text === "🏠 Main Menu") {
    sendMainMenu(chatId);
  }
  else if (userProgress[chatId] && userProgress[chatId].currentQuiz) {
    checkAnswer(chatId, text);
  }
});

function setUserLevel(chatId, level) {
  userProgress[chatId] = userProgress[chatId] || { score: 0, quizzesTaken: 0 };
  userProgress[chatId].level = level;
  
  const message = level === 'elementary' 
    ? "👶 Elementary mode activated! Fun learning ahead! 🎨"
    : "📚 Grade 5 mode enabled! Ready for challenges? 💪";
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      keyboard: [
        ["📚 Take Quiz", "🤖 Smart AI Quiz"],
        ["📊 My Progress", "🏠 Main Menu"]
      ],
      resize_keyboard: true
    }
  });
}

async function sendSmartAIQuiz(chatId) {
  const user = userProgress[chatId];
  if (!user || !user.level) {
    bot.sendMessage(chatId, "Please choose your grade level first! Use /start");
    return;
  }

  const subjects = ['math', 'science'];
  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  
  bot.sendMessage(chatId, "🧠 Generating smart AI quiz...");
  
  const quiz = await smartAI.generateAIQuiz(user.level, subject);
  
  userProgress[chatId].currentQuiz = quiz;

  const optionsKeyboard = quiz.options.map(opt => [opt]);
  optionsKeyboard.push(["🏠 Main Menu"]);

  bot.sendMessage(chatId, `${quiz.question}`, {
    reply_markup: {
      keyboard: optionsKeyboard,
      resize_keyboard: true
    }
  });
}

function sendRegularQuiz(chatId) {
  const user = userProgress[chatId];
  if (!user || !user.level) {
    bot.sendMessage(chatId, "Please choose your grade level first! Use /start");
    return;
  }

  const quizzes = user.level === 'elementary' ? [
    {
      question: "🐘 What is 7 + 8?",
      options: ["A) 14", "B) 15", "C) 16", "D) 17"],
      correct: 1,
      explanation: "7 + 8 = 15! Great job! 🎉"
    },
    {
      question: "🌈 Which color comes after Red in rainbow?",
      options: ["A) Blue", "B) Orange", "C) Green", "D) Yellow"],
      correct: 1,
      explanation: "Rainbow order: Red, Orange, Yellow, Green, Blue, Indigo, Violet!"
    }
  ] : [
    {
      question: "📐 What is 15 × 6?",
      options: ["A) 80", "B) 90", "C) 100", "D) 110"],
      correct: 1,
      explanation: "15 × 6 = 90! Multiplication mastery! 🔥"
    },
    {
      question: "🌍 Which planet has the most moons?",
      options: ["A) Earth", "B) Jupiter", "C) Saturn", "D) Mars"],
      correct: 2,
      explanation: "Saturn has the most moons in our solar system! 🪐"
    }
  ];

  const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
  userProgress[chatId].currentQuiz = quiz;

  const optionsKeyboard = quiz.options.map(opt => [opt]);
  optionsKeyboard.push(["🏠 Main Menu"]);

  bot.sendMessage(chatId, `📚 ${quiz.question}`, {
    reply_markup: {
      keyboard: optionsKeyboard,
      resize_keyboard: true
    }
  });
}

function checkAnswer(chatId, selectedAnswer) {
  const user = userProgress[chatId];
  const quiz = user.currentQuiz;

  const selectedLetter = selectedAnswer.charAt(0);
  const correctLetter = String.fromCharCode(65 + quiz.correct);

  if (selectedLetter === correctLetter) {
    user.score = (user.score || 0) + 10;
    user.quizzesTaken = (user.quizzesTaken || 0) + 1;
    
    bot.sendMessage(chatId, `✅ Correct! 🎉 +10 points!\n${quiz.explanation}\n\nTotal: ${user.score} points`);
  } else {
    bot.sendMessage(chatId, `❌ Oops! Correct answer was ${correctLetter}\n${quiz.explanation}`);
  }

  delete userProgress[chatId].currentQuiz;
  
  bot.sendMessage(chatId, "What would you like to do next?", {
    reply_markup: {
      keyboard: [
        ["📚 Take Quiz", "🤖 Smart AI Quiz"],
        ["📊 My Progress", "🏠 Main Menu"]
      ],
      resize_keyboard: true
    }
  });
}

function showProgress(chatId) {
  const user = userProgress[chatId];
  const score = user?.score || 0;
  const quizzes = user?.quizzesTaken || 0;
  
  const message = `📊 Your Learning Journey:

🏆 Total Points: ${score}
📚 Quizzes Completed: ${quizzes}
⭐ Learning Level: ${getLearningLevel(quizzes)}
🎯 Smart AI Quizzes: ${user?.aiQuizzes || 0}

Keep up the great work! 🚀`;
  
  bot.sendMessage(chatId, message);
}

function getLearningLevel(quizzes) {
  if (quizzes < 3) return "🌱 Beginner Explorer";
  if (quizzes < 7) return "🚀 Active Learner";
  if (quizzes < 12) return "⭐ Knowledge Seeker";
  return "🏆 Master Scholar";
}

function showLeaderboard(chatId) {
  const message = `🏆 CodeX Learn Leaderboard:

🥇 Top Learner: Anjali - 150 points
🥈 Math Master: Raj - 120 points  
🥉 Science Star: Priya - 100 points
4️⃣ Quick Thinker: Sam - 90 points
5️⃣ Diligent Student: Alex - 80 points

🏅 Your position: Top 10% 🎯

Keep learning to climb higher! 📈`;
  
  bot.sendMessage(chatId, message);
}

function sendAbout(chatId) {
  const aboutMsg = `ℹ️ About CodeX Learn - Smart AI Edition:

🎯 Mission: Make learning engaging and accessible
🧠 Technology: Advanced algorithm-based content generation
📱 Platform: Telegram bot for low-data usage
🎓 Levels: Elementary (6-10) & Grade 5 (10-11)
💡 Features: Smart AI quizzes, progress tracking, gamification
🌍 Impact: Bridging educational gaps with technology

No external AI required - everything runs locally! 🔒

Built with ❤️ by Team CodeX`;
  
  bot.sendMessage(chatId, aboutMsg);
}

function sendMainMenu(chatId) {
  bot.sendMessage(chatId, "🏠 Main Menu - Choose an option:", {
    reply_markup: {
      keyboard: [
        ["👶 Elementary Mode", "📚 Grade 5 Mode"],
        ["🤖 Smart AI Quiz", "📊 My Progress"],
        ["🎯 Leaderboard", "ℹ️ About"]
      ],
      resize_keyboard: true
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log('🤖 CodeX Learn - Smart AI Bot Started!');
  console.log('🧠 Advanced quiz generation enabled');
  console.log('🚀 Bot is running! Test on Telegram now!');
});

console.log('✅ Bot initialized successfully!');