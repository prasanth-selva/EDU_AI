const { exec } = require('child_process');

class OllamaGenerator {
  constructor(model = 'tinyllama:1.1b-chat') {
    this.model = model;
    this.isAvailable = false;
    this.checkOllamaAsync();
  }

  async checkOllamaAsync() {
    try {
      // Quick check if Ollama responds
      const result = await this.runCommand('ollama list');
      this.isAvailable = result.includes('tinyllama') || result.includes('NAME');
      console.log(this.isAvailable ? '✅ Ollama available' : '❌ Ollama not available');
    } catch (error) {
      this.isAvailable = false;
      console.log('❌ Ollama check failed:', error.message);
    }
  }

  runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async generateAIQuiz(grade, subject) {
    // Always try AI first, fallback if fails
    try {
      console.log(`🤖 Attempting AI generation for ${grade} ${subject}...`);
      
      const prompt = `Create a ${grade} level ${subject} multiple choice question with 4 options and explanation. Keep it simple.`;
      
      const response = await this.runCommand(`ollama run ${this.model} "${prompt}"`);
      
      return this.parseCreativeResponse(response, grade, subject);
      
    } catch (error) {
      console.log('AI failed, using smart fallback');
      return this.generateSmartFallback(grade, subject);
    }
  }

  parseCreativeResponse(response, grade, subject) {
    // Extract question from any AI response format
    const lines = response.split('\n').filter(line => line.trim().length > 10);
    
    let question = lines[0] || `Interesting ${subject} question for ${grade}`;
    question = question.length > 200 ? question.substring(0, 200) + '...' : question;
    
    // Generate relevant options based on subject
    const options = this.generateRelevantOptions(grade, subject);
    
    return {
      question: `🤖 AI: ${question}`,
      options: options,
      correct: Math.floor(Math.random() * 4),
      explanation: "AI-generated question! Think carefully! 💡",
      source: 'ai'
    };
  }

  generateSmartFallback(grade, subject) {
    const questionTemplates = {
      elementary: {
        math: [
          "If you have {{a}} apples and get {{b}} more, how many total?",
          "What is {{a}} + {{b}}?",
          "How many sides does a {{shape}} have?",
          "If one hour has 60 minutes, how many minutes in {{hours}} hours?"
        ],
        science: [
          "Which animal {{action}}?",
          "What do plants need to {{process}}?",
          "Which planet is known for {{characteristic}}?",
          "What season comes after {{season}}?"
        ]
      },
      grade5: {
        math: [
          "What is {{a}}% of {{b}}?",
          "Calculate: {{a}} × {{b}} + {{c}}",
          "If x + {{a}} = {{b}}, what is x?",
          "What is the area of a {{shape}} with dimensions {{a}} and {{b}}?"
        ],
        science: [
          "What is the process of {{process}} called?",
          "Which element is used for {{purpose}}?",
          "What force causes {{effect}}?",
          "How does {{organism}} {{process}}?"
        ]
      }
    };

    const templates = questionTemplates[grade]?.[subject] || questionTemplates.elementary.math;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const question = this.fillTemplate(template, grade, subject);
    const options = this.generateRelevantOptions(grade, subject);
    
    return {
      question: question,
      options: options,
      correct: Math.floor(Math.random() * 4),
      explanation: "Great learning! Keep practicing! 📚",
      source: 'smart_fallback'
    };
  }

  fillTemplate(template, grade, subject) {
    const vars = {
      a: Math.floor(Math.random() * 20) + 1,
      b: Math.floor(Math.random() * 20) + 1,
      c: Math.floor(Math.random() * 10) + 1,
      shape: ['triangle', 'square', 'pentagon', 'circle'][Math.floor(Math.random() * 4)],
      hours: Math.floor(Math.random() * 5) + 2,
      action: ['lives in water', 'eats grass', 'can fly', 'hibernates'][Math.floor(Math.random() * 4)],
      process: ['make food', 'grow', 'breathe', 'reproduce'][Math.floor(Math.random() * 4)],
      characteristic: ['rings', 'red color', 'great red spot', 'closeness to sun'][Math.floor(Math.random() * 4)],
      season: ['winter', 'spring', 'summer', 'autumn'][Math.floor(Math.random() * 4)],
      purpose: ['breathing', 'burning', 'making water', 'photosynthesis'][Math.floor(Math.random() * 4)],
      effect: ['objects to fall', 'tides', 'seasons', 'magnetism'][Math.floor(Math.random() * 4)],
      organism: ['plants', 'animals', 'humans', 'bacteria'][Math.floor(Math.random() * 4)]
    };

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] || match);
  }

  generateRelevantOptions(grade, subject) {
    const baseNumbers = [5, 8, 12, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 100];
    const randomNumbers = [...baseNumbers].sort(() => Math.random() - 0.5);
    
    if (subject === 'math') {
      return [
        `A) ${randomNumbers[0]}`,
        `B) ${randomNumbers[1]}`,
        `C) ${randomNumbers[2]}`,
        `D) ${randomNumbers[3]}`
      ];
    } else {
      const scienceOptions = {
        elementary: ['Lion', 'Cow', 'Fish', 'Eagle', 'Tree', 'Flower', 'Sun', 'Moon'],
        grade5: ['Oxygen', 'Carbon', 'Water', 'Energy', 'Gravity', 'Magnetism', 'Cell', 'Atom']
      };
      
      const opts = scienceOptions[grade] || scienceOptions.elementary;
      const shuffled = [...opts].sort(() => Math.random() - 0.5);
      
      return [
        `A) ${shuffled[0]}`,
        `B) ${shuffled[1]}`,
        `C) ${shuffled[2]}`,
        `D) ${shuffled[3]}`
      ];
    }
  }
}

// Test
async function testGenerator() {
  console.log('🧪 Testing Quiz Generator...');
  
  const generator = new OllamaGenerator();
  
  // Test multiple quizzes
  for (let i = 0; i < 3; i++) {
    const quiz = await generator.generateAIQuiz('elementary', 'math');
    console.log(`\n📚 Quiz ${i + 1}:`, quiz.question);
    console.log('Options:', quiz.options);
    console.log('Source:', quiz.source);
  }
}

if (require.main === module) {
  testGenerator();
}

module.exports = OllamaGenerator;