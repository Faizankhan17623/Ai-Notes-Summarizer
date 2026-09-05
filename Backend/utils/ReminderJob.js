const User = require('../Models/User')
const Exam = require('../Models/Exam')
const StudyRoom = require('../Models/StudyRoom')
const Flashcard = require('../Models/Flashcard')
const Notification = require('../Models/Notification')
const { notify } = require('../controllers/Notification')
const { computeWeakTopics } = require('./WeakTopics')

const alreadySent = async (user, type) => Notification.exists({ user, type, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
const runReminders = async () => {
    const now = new Date(); const tomorrow = new Date(now.getTime() + 24 * 3600000)
    const users = await User.find({ isBanned: false }).select('_id lastStreakDate')
    for (const user of users) {
        try {
            const due = await Flashcard.countDocuments({ user: user._id, dueDate: { $lte: now } })
            if (due && !(await alreadySent(user._id, 'flashcards_due'))) notify({ user: user._id, type: 'flashcards_due', message: `${due} flashcard${due === 1 ? '' : 's'} are due for review.`, link: '/Dashboard/Review' })
            const exams = await Exam.find({ user: user._id, examDate: { $gte: now, $lte: tomorrow } }).select('title _id')
            for (const exam of exams) notify({ user: user._id, type: 'exam_tomorrow', message: `${exam.title} is tomorrow. Keep your preparation on track.`, link: `/Dashboard/Exam/${exam._id}` })
            const rooms = await StudyRoom.find({ 'members.user': user._id }).select('name tasks examDate')
            const unfinished = rooms.reduce((n, r) => n + r.tasks.filter(t => !t.done && String(t.assignee) === String(user._id)).length, 0)
            if (unfinished && !(await alreadySent(user._id, 'room_tasks'))) notify({ user: user._id, type: 'room_tasks', message: `You have ${unfinished} unfinished study-room task${unfinished === 1 ? '' : 's'}.`, link: '/Dashboard/StudyRooms' })
            for (const room of rooms.filter(r => r.examDate && r.examDate >= now && r.examDate <= tomorrow)) notify({ user: user._id, type: 'room_exam_tomorrow', message: `Your study room "${room.name}" has an exam tomorrow.`, link: '/Dashboard/StudyRooms' })
            if (user.lastStreakDate && now - new Date(user.lastStreakDate) > 48 * 3600000 && !(await alreadySent(user._id, 'missed_study_day'))) notify({ user: user._id, type: 'missed_study_day', message: 'You missed a study day. A short review today can restart your streak.', link: '/Dashboard/StudyPlan' })
            const weak = await computeWeakTopics(user._id)
            if (weak.length && !(await alreadySent(user._id, 'weak_topic'))) notify({ user: user._id, type: 'weak_topic', message: `Review your weakest topic: ${weak[0].tag}.`, link: '/Dashboard/Review' })
        } catch (error) { console.log(`Reminder failed for ${user._id}:`, error.message) }
    }
}
module.exports = { runReminders }
