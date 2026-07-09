const express = require('express')
const route = express.Router()
const { Auth } = require('../Middlewares/Auth.js')
const { aiLimiter } = require('../Middlewares/RateLimit.js')
const { doubleCsrfProtection } = require('../Middlewares/Csrf.js')
const { validate } = require('../Middlewares/Validate.js')
const { reviewFlashcardRules, attemptQuizRules } = require('../Middlewares/ValidationRules.js')
const {
    generateFlashcards,
    getFlashcardsForNote,
    getDueFlashcards,
    reviewFlashcard,
    deleteFlashcard,
    generateQuiz,
    getQuizzesForNote,
    attemptQuiz,
    deleteQuiz,
} = require('../controllers/StudyKit.js')

// generation hits Groq sir so it gets the AI rate limit + costs a credit, Pro+ only
route.post('/notes/:noteId/flashcards', aiLimiter, doubleCsrfProtection, Auth, generateFlashcards)
route.get('/notes/:noteId/flashcards', Auth, getFlashcardsForNote)
route.get('/flashcards/due', Auth, getDueFlashcards)
route.post('/flashcards/:id/review', doubleCsrfProtection, reviewFlashcardRules, validate, Auth, reviewFlashcard)
route.delete('/flashcards/:id', doubleCsrfProtection, Auth, deleteFlashcard)

route.post('/notes/:noteId/quiz', aiLimiter, doubleCsrfProtection, Auth, generateQuiz)
route.get('/notes/:noteId/quizzes', Auth, getQuizzesForNote)
route.post('/quizzes/:id/attempt', doubleCsrfProtection, attemptQuizRules, validate, Auth, attemptQuiz)
route.delete('/quizzes/:id', doubleCsrfProtection, Auth, deleteQuiz)

module.exports = route
