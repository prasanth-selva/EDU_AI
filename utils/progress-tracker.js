class ProgressTracker {
  constructor() {
    this.userProgress = {};
  }

  setUserLevel(chatId, level) {
    if (!this.userProgress[chatId]) {
      this.userProgress[chatId] = { 
        score: 0, 
        quizzesTaken: 0,
        level: level,
        achievements: []
      };
    } else {
      this.userProgress[chatId].level = level;
    }
    return this.userProgress[chatId];
  }

  updateScore(chatId, points = 10) {
    if (!this.userProgress[chatId]) {
      this.userProgress[chatId] = { score: 0, quizzesTaken: 0 };
    }
    this.userProgress[chatId].score += points;
    this.userProgress[chatId].quizzesTaken += 1;
    
    // Check for achievements
    this.checkAchievements(chatId);
    
    return this.userProgress[chatId];
  }

  checkAchievements(chatId) {
    const user = this.userProgress[chatId];
    const achievements = [];
    
    if (user.score >= 50 && !user.achievements.includes('first_50')) {
      achievements.push('first_50');
      user.achievements.push('first_50');
    }
    
    if (user.quizzesTaken >= 10 && !user.achievements.includes('quiz_master')) {
      achievements.push('quiz_master');
      user.achievements.push('quiz_master');
    }
    
    return achievements;
  }

  getUserProgress(chatId) {
    return this.userProgress[chatId] || null;
  }

  getLeaderboard() {
    return Object.entries(this.userProgress)
      .sort(([,a], [,b]) => b.score - a.score)
      .slice(0, 10);
  }
}

module.exports = ProgressTracker;