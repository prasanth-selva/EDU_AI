const elementaryQuizzes = require('../data/elementary-quizzes.json');
const grade5Quizzes = require('../data/grade5-quizzes.json');

class QuizManager {
  static getQuiz(level) {
    const quizPool = level === 'elementary' ? elementaryQuizzes.quizzes : grade5Quizzes.quizzes;
    return quizPool[Math.floor(Math.random() * quizPool.length)];
  }

  static getAllQuizzes(level) {
    return level === 'elementary' ? elementaryQuizzes.quizzes : grade5Quizzes.quizzes;
  }

  static checkAnswer(quiz, selectedOption) {
    return quiz.options[quiz.correct] === selectedOption;
  }
}

module.exports = QuizManager;