const fs = require('fs');
const path = require('path');

class OfflineGenerator {
  constructor() {
    this.quizPacks = {};
  }

  // Generate large quiz packs for offline use
  generateOfflinePacks() {
    console.log('📦 Generating offline quiz packs...');
    
    this.quizPacks = {
      elementary_math: this.generateMathQuizzes('elementary', 100),
      elementary_science: this.generateScienceQuizzes('elementary', 80),
      elementary_english: this.generateEnglishQuizzes('elementary', 60),
      grade5_math: this.generateMathQuizzes('grade5', 100),
      grade5_science: this.generateScienceQuizzes('grade5', 80),
      grade5_english: this.generateEnglishQuizzes('grade5', 60)
    };

    // Save as JSON file
    fs.writeFileSync(
      path.join(__dirname, 'offline-quiz-packs.json'),
      JSON.stringify(this.quizPacks, null, 2)
    );

    // Generate HTML viewer for SD card
    this.generateHTMLViewer();

    console.log('✅ Offline packs generated! Ready for SD card.');
    return this.quizPacks;
  }

  generateMathQuizzes(grade, count) {
    const quizzes = [];
    for (let i = 0; i < count; i++) {
      if (grade === 'elementary') {
        quizzes.push(this.generateElementaryMathQuiz());
      } else {
        quizzes.push(this.generateGrade5MathQuiz());
      }
    }
    return quizzes;
  }

  generateElementaryMathQuiz() {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const operations = ['+', '-', '×', '÷'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let answer, question;
    
    switch(op) {
      case '+':
        answer = num1 + num2;
        question = `What is ${num1} + ${num2}?`;
        break;
      case '-':
        answer = num1 - num2;
        question = `What is ${num1} - ${num2}?`;
        break;
      case '×':
        answer = num1 * num2;
        question = `What is ${num1} × ${num2}?`;
        break;
      case '÷':
        answer = num1;
        question = `What is ${num1 * num2} ÷ ${num2}?`;
        break;
    }

    const options = this.generateOptions(answer);
    
    return {
      id: `math_${Date.now()}_${i}`,
      question: question,
      options: options,
      correct: options.findIndex(opt => opt.includes(answer.toString())) + 1,
      explanation: `The answer is ${answer}! Great work! 🎉`,
      subject: 'math',
      grade: 'elementary'
    };
  }

  generateGrade5MathQuiz() {
    const types = ['percentage', 'fraction', 'algebra', 'geometry'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let question, answer, explanation;
    
    switch(type) {
      case 'percentage':
        const num = Math.floor(Math.random() * 100) + 50;
        const percent = Math.floor(Math.random() * 50) + 10;
        answer = Math.round(num * percent / 100);
        question = `What is ${percent}% of ${num}?`;
        explanation = `${percent}% of ${num} = ${answer}!`;
        break;
      case 'fraction':
        const n1 = Math.floor(Math.random() * 10) + 1;
        const n2 = Math.floor(Math.random() * 10) + 1;
        const d1 = Math.floor(Math.random() * 10) + 1;
        const d2 = Math.floor(Math.random() * 10) + 1;
        answer = (n1/d1 + n2/d2).toFixed(2);
        question = `What is ${n1}/${d1} + ${n2}/${d2}?`;
        explanation = `${n1}/${d1} + ${n2}/${d2} = ${answer}!`;
        break;
    }

    const options = this.generateOptions(parseFloat(answer));
    
    return {
      id: `math_grade5_${Date.now()}`,
      question: question,
      options: options,
      correct: options.findIndex(opt => opt.includes(answer.toString())) + 1,
      explanation: explanation,
      subject: 'math',
      grade: 'grade5'
    };
  }

  generateScienceQuizzes(grade, count) {
    const quizzes = [];
    const scienceQuestions = grade === 'elementary' ? 
      this.elementaryScienceQuestions : this.grade5ScienceQuestions;
    
    for (let i = 0; i < count && i < scienceQuestions.length; i++) {
      quizzes.push(scienceQuestions[i]);
    }
    return quizzes;
  }

  generateOptions(correctAnswer) {
    const options = [correctAnswer];
    
    // Add wrong options
    for (let i = 0; i < 3; i++) {
      let wrongAnswer;
      if (typeof correctAnswer === 'number') {
        const variation = Math.floor(Math.random() * 10) + 5;
        wrongAnswer = Math.random() > 0.5 ? correctAnswer + variation : correctAnswer - variation;
        if (wrongAnswer === correctAnswer) wrongAnswer += 1;
      } else {
        wrongAnswer = `Wrong ${i + 1}`;
      }
      options.push(wrongAnswer);
    }
    
    // Shuffle options
    return options.sort(() => Math.random() - 0.5)
                 .map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`);
  }

  generateHTMLViewer() {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>CodeX Learn - Offline</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="sd-card-style.css">
</head>
<body>
    <div class="container">
        <h1>🎓 CodeX Learn - Offline Mode</h1>
        <div class="subject-grid">
            <div class="subject-card" onclick="loadQuizzes('elementary_math')">
                <h3>👶 Elementary Math</h3>
                <p>100+ quizzes</p>
            </div>
            <div class="subject-card" onclick="loadQuizzes('elementary_science')">
                <h3>🔬 Elementary Science</h3>
                <p>80+ quizzes</p>
            </div>
            <div class="subject-card" onclick="loadQuizzes('grade5_math')">
                <h3>📚 Grade 5 Math</h3>
                <p>100+ quizzes</p>
            </div>
            <div class="subject-card" onclick="loadQuizzes('grade5_science')">
                <h3>🧪 Grade 5 Science</h3>
                <p>80+ quizzes</p>
            </div>
        </div>
        
        <div id="quiz-container" class="hidden">
            <div id="question-card">
                <h2 id="question-text"></h2>
                <div id="options-container"></div>
                <button onclick="checkAnswer()">Submit</button>
                <button onclick="showMainMenu()">Back to Menu</button>
            </div>
            <div id="result-card" class="hidden">
                <h2 id="result-text"></h2>
                <p id="explanation-text"></p>
                <button onclick="nextQuestion()">Next Quiz</button>
            </div>
        </div>
    </div>
    
    <script src="offline-quiz-packs.json"></script>
    <script>
        let currentQuizzes = [];
        let currentQuizIndex = 0;
        let selectedAnswer = null;
        
        function loadQuizzes(packName) {
            currentQuizzes = window.quizPacks[packName] || [];
            currentQuizIndex = 0;
            document.getElementById('quiz-container').classList.remove('hidden');
            document.querySelector('.subject-grid').classList.add('hidden');
            showQuestion();
        }
        
        function showQuestion() {
            if (currentQuizIndex >= currentQuizzes.length) {
                alert('🎉 You completed all quizzes!');
                showMainMenu();
                return;
            }
            
            const quiz = currentQuizzes[currentQuizIndex];
            document.getElementById('question-text').textContent = quiz.question;
            
            const optionsContainer = document.getElementById('options-container');
            optionsContainer.innerHTML = '';
            
            quiz.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.textContent = option;
                button.onclick = () => selectAnswer(index);
                optionsContainer.appendChild(button);
            });
            
            document.getElementById('result-card').classList.add('hidden');
            document.getElementById('question-card').classList.remove('hidden');
            selectedAnswer = null;
        }
        
        function selectAnswer(index) {
            selectedAnswer = index;
            document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
            document.querySelectorAll('.option-btn')[index].classList.add('selected');
        }
        
        function checkAnswer() {
            if (selectedAnswer === null) {
                alert('Please select an answer!');
                return;
            }
            
            const quiz = currentQuizzes[currentQuizIndex];
            const isCorrect = selectedAnswer === quiz.correct;
            
            document.getElementById('result-text').textContent = 
                isCorrect ? '✅ Correct! 🎉' : '❌ Try Again!';
            document.getElementById('explanation-text').textContent = quiz.explanation;
            
            document.getElementById('question-card').classList.add('hidden');
            document.getElementById('result-card').classList.remove('hidden');
        }
        
        function nextQuestion() {
            currentQuizIndex++;
            showQuestion();
        }
        
        function showMainMenu() {
            document.getElementById('quiz-container').classList.add('hidden');
            document.querySelector('.subject-grid').classList.remove('hidden');
        }
    </script>
</body>
</html>
    `;

    fs.writeFileSync(path.join(__dirname, 'sd-card-viewer.html'), html);
  }

  // Predefined science questions
  elementaryScienceQuestions = [
    {
      id: "sci_1",
      question: "Which planet is closest to the Sun?",
      options: ["A) Earth", "B) Venus", "C) Mercury", "D) Mars"],
      correct: 2,
      explanation: "Mercury is the closest planet to the Sun! 🌞",
      subject: "science",
      grade: "elementary"
    },
    {
      id: "sci_2", 
      question: "What do plants need to make food?",
      options: ["A) Water", "B) Sunlight", "C) Air", "D) All of the above"],
      correct: 3,
      explanation: "Plants need water, sunlight, and air for photosynthesis! 🌱",
      subject: "science",
      grade: "elementary"
    }
  ];

  grade5ScienceQuestions = [
    {
      id: "sci_grade5_1",
      question: "What is H₂O commonly known as?",
      options: ["A) Oxygen", "B) Water", "C) Carbon dioxide", "D) Hydrogen"],
      correct: 1,
      explanation: "H₂O is the chemical formula for Water! 💧",
      subject: "science", 
      grade: "grade5"
    },
    {
      id: "sci_grade5_2",
      question: "Which gas do plants absorb from the air?",
      options: ["A) Oxygen", "B) Nitrogen", "C) Carbon dioxide", "D) Hydrogen"],
      correct: 2,
      explanation: "Plants absorb Carbon dioxide for photosynthesis! 🌿",
      subject: "science",
      grade: "grade5"
    }
  ];
}

module.exports = OfflineGenerator;

// Run if called directly
if (require.main === module) {
  const generator = new OfflineGenerator();
  generator.generateOfflinePacks();
}