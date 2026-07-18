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
const { exportReviewQueue, exportFlashcardDeck, exportQuiz } = require('../controllers/Export.js')

// generation hits Groq sir so it gets the AI rate limit + costs a credit, Pro+ only
route.post('/notes/:noteId/flashcards', aiLimiter, doubleCsrfProtection, Auth, generateFlashcards)
route.get('/notes/:noteId/flashcards', Auth, getFlashcardsForNote)
// must come before /notes/:noteId/flashcards above's :noteId ambiguity is fine (different verb+suffix),
// but keep it next to the other flashcard routes for discoverability sir
route.get('/notes/:noteId/flashcards/export', Auth, exportFlashcardDeck)
route.get('/flashcards/due', Auth, getDueFlashcards)
// must come before /flashcards/:id/review and /flashcards/:id below sir — same reason as
// elsewhere in this codebase, "export" would otherwise be read as the :id param
route.get('/flashcards/review/export', Auth, exportReviewQueue)
route.post('/flashcards/:id/review', doubleCsrfProtection, reviewFlashcardRules, validate, Auth, reviewFlashcard)
route.delete('/flashcards/:id', doubleCsrfProtection, Auth, deleteFlashcard)

route.post('/notes/:noteId/quiz', aiLimiter, doubleCsrfProtection, Auth, generateQuiz)
route.get('/notes/:noteId/quizzes', Auth, getQuizzesForNote)
// must come before /quizzes/:id/attempt and /quizzes/:id below sir — same "export" vs :id trap
route.get('/quizzes/:quizId/export', Auth, exportQuiz)
route.post('/quizzes/:id/attempt', doubleCsrfProtection, attemptQuizRules, validate, Auth, attemptQuiz)
route.delete('/quizzes/:id', doubleCsrfProtection, Auth, deleteQuiz)

module.exports = route
