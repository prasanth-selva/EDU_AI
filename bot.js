const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ⚠️ REPLACE WITH YOUR BOT TOKEN FROM @BotFather
const TOKEN = '8502164066:AAFw1NtmHYWPTPc9PSq9E0gDoQ-hXGa6El8';

// Initialize bot
const bot = new TelegramBot(TOKEN, { 
  polling: true 
});

// Store user progress
let userProgress = {};

// Load quiz data
const elementaryQuizzes = [
  {
    id: 1,
    question: "🐘 What is 5 + 3?",
    options: ["7", "8", "9"],
    correct: 1,
    explanation: "5 + 3 = 8! Great job! 🎉"
  },
  {
    id: 2,
    question: "🌈 Which color comes after Red in rainbow?",
    options: ["Blue", "Orange", "Green"],
    correct: 1,
    explanation: "Rainbow order: Red, Orange, Yellow, Green, Blue, Indigo, Violet!"
  },
  {
    id: 3,
    question: "🦁 Which animal is called King of Jungle?",
    options: ["Elephant", "Lion", "Tiger"],
    correct: 1,
    explanation: "Lion is called the King of Jungle! 🦁"
  }
];

const grade5Quizzes = [
  {
    id: 1,
    question: "📐 What is 12 × 8?",
    options: ["96", "84", "108"],
    correct: 0,
    explanation: "12 × 8 = 96! Multiplication mastery! 🔥"
  },
  {
    id: 2,
    question: "🌍 Which planet is known as Red Planet?",
    options: ["Venus", "Mars", "Jupiter"],
    correct: 1,
    explanation: "Mars is called Red Planet due to iron oxide!"
  }
];

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  const welcomeMsg = `🎓 Welcome to CodeX Learn! 

I help students learn through fun quizzes!

Choose your grade level:`;

  bot.sendMessage(chatId, welcomeMsg, {
    reply_markup: {
      keyboard: [
        ["👶 Elementary (6-10 years)", "📚 Grade 5 (10-11 years)"],
        ["ℹ️ About"]
      ],
      resize_keyboard: true
    }
  });
});

// Handle all messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "👶 Elementary (6-10 years)") {
    setUserLevel(chatId, 'elementary');
  } 
  else if (text === "📚 Grade 5 (10-11 years)") {
    setUserLevel(chatId, 'grade5');
  }
  else if (text === "📚 Take Quiz") {
    sendQuiz(chatId);
  }
  else if (text === "🏆 My Score") {
    showScore(chatId);
  }
  else if (text === "📊 Leaderboard") {
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
  if (!userProgress[chatId]) {
    userProgress[chatId] = { score: 0, quizzesTaken: 0 };
  }
  userProgress[chatId].level = level;
  
  const message = level === 'elementary' 
    ? "👶 Elementary level selected! Fun learning ahead! 🎨"
    : "📚 Grade 5 level activated! Ready for challenges? 💪";
  
  bot.sendMessage(chatId, message);
  sendMainMenu(chatId);
}

function sendMainMenu(chatId) {
  const user = userProgress[chatId];
  const level = user ? user.level : 'not set';
  
  const message = `📚 ${level.toUpperCase()} MODE

What would you like to do?`;

  bot.sendMessage(chatId, message, {
    reply_markup: {
      keyboard: [
        ["📚 Take Quiz", "🏆 My Score"],
        ["📊 Leaderboard", "ℹ️ About"],
        ["🏠 Main Menu"]
      ],
      resize_keyboard: true
    }
  });
}

function sendQuiz(chatId) {
  const user = userProgress[chatId];
  if (!user || !user.level) {
    bot.sendMessage(chatId, "Please choose your grade level first! Send /start");
    return;
  }

  const quizPool = user.level === 'elementary' ? elementaryQuizzes : grade5Quizzes;
  const quiz = quizPool[Math.floor(Math.random() * quizPool.length)];
  
  userProgress[chatId].currentQuiz = quiz;

  bot.sendMessage(chatId, `🎯 ${quiz.question}`, {
    reply_markup: {
      keyboard: [
        [quiz.options[0], quiz.options[1]],
        [quiz.options[2], "🏠 Main Menu"]
      ],
      resize_keyboard: true
    }
  });
}

function checkAnswer(chatId, selectedAnswer) {
  const user = userProgress[chatId];
  const quiz = user.currentQuiz;

  if (quiz.options.includes(selectedAnswer)) {
    const isCorrect = selectedAnswer === quiz.options[quiz.correct];
    
    if (isCorrect) {
      user.score += 10;
      user.quizzesTaken++;
      bot.sendMessage(chatId, `✅ Correct! 🎉 +10 points!\n${quiz.explanation}\n\nYour total: ${user.score} points`);
    } else {
      bot.sendMessage(chatId, `❌ Oops! Correct answer: ${quiz.options[quiz.correct]}\n${quiz.explanation}`);
    }

    delete userProgress[chatId].currentQuiz;
    
    // Ask for next action
    bot.sendMessage(chatId, "What would you like to do next?", {
      reply_markup: {
        keyboard: [
          ["📚 Take Quiz", "🏆 My Score"],
          ["🏠 Main Menu"]
        ],
        resize_keyboard: true
      }
    });
  }
}

function showScore(chatId) {
  const user = userProgress[chatId];
  if (!user) {
    bot.sendMessage(chatId, "Start learning first! Send /start and choose your grade level.");
    return;
  }

  const score = user.score || 0;
  const level = user.level || 'not set';
  
  let message = `📊 Your Learning Progress:

🏆 Total Points: ${score}
📚 Quizzes Completed: ${user.quizzesTaken || 0}
⭐ Level: ${getLevel(score)}
🎓 Mode: ${level.toUpperCase()}`;

  if (score === 0) {
    message += "\n\nStart with '📚 Take Quiz' to earn your first points!";
  }

  bot.sendMessage(chatId, message);
}

function showLeaderboard(chatId) {
  const message = `🏆 CodeX Learn Leaderboard:

👶 ELEMENTARY STARS:
1. Anjali - 80 points 🥇
2. Rohan - 60 points 🥈  
3. Priya - 50 points 🥉

📚 GRADE 5 CHAMPIONS:
1. Suresh - 120 points 🥇
2. Meera - 100 points 🥈
3. Arjun - 90 points 🥉

Keep learning to climb the leaderboard! 📈`;

  bot.sendMessage(chatId, message);
}

function sendAbout(chatId) {
  const aboutMsg = `ℹ️ About CodeX Learn:

🎯 Mission: Make learning accessible for all children
📱 Platform: Telegram bot for low-data usage
🎓 Levels: Elementary (6-10) & Grade 5 (10-11)
💡 Features: Gamified quizzes, progress tracking
🌍 Impact: Bridging the digital divide in education

Built with ❤️ by Team CodeX`;

  bot.sendMessage(chatId, aboutMsg);
}

function getLevel(score) {
  if (score < 20) return "🌱 Beginner";
  if (score < 50) return "🚀 Learner"; 
  if (score < 100) return "⭐ Star Student";
  return "🏆 Champion";
}

// Error handling
bot.on('polling_error', (error) => {
  console.log('Polling error:', error.code);
});

// Start server
app.listen(PORT, () => {
  console.log('🤖 CodeX Learn Bot Started!');
  console.log('📚 Serving: Elementary (6-10) & Grade 5 (10-11) students');
  console.log('🚀 Bot is running!');
  console.log('📱 Test your bot on Telegram now!');
});

console.log('✅ Bot initialized successfully!');