import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaClock, FaArrowLeft } from 'react-icons/fa'
import { GetExam, AttemptExam } from '../../Services/operations/StudyKit.js'
import { setActiveExam } from '../../Slices/studyKitSlice.js'
import Loading from '../extra/Loading.jsx'
import { fadeUp, staggerContainer, scaleIn } from '../extra/motionVariants.js'

const formatSeconds = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
}

// the actual take-the-exam view sir — mounted fresh (via `key` in the wrapper below) once
// activeExam is loaded, so all local state can initialize straight from it with no extra
// "sync props into state" effect
const ExamSession = ({ exam, examId, token }) => {
    const dispatch = useDispatch()
    const lastAttempt = exam.attempts?.[exam.attempts.length - 1]

    const [answers, setAnswers] = useState(() => Array(exam.questions.length).fill(null))
    const [result, setResult] = useState(() => lastAttempt ? { score: lastAttempt.score, total: lastAttempt.total } : null)
    const [secondsLeft, setSecondsLeft] = useState(() => (!lastAttempt && exam.timeLimitSeconds) ? exam.timeLimitSeconds : null)
    const startedAtRef = useRef(null)
    useEffect(() => {
        startedAtRef.current = Date.now()
    }, [])

    const allAnswered = useMemo(() => answers.length > 0 && answers.every((a) => a !== null), [answers])

    const handleSubmit = async () => {
        const durationSeconds = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : undefined
        const data = await dispatch(AttemptExam(examId, answers, durationSeconds, token))
        if (data) setResult({ score: data.score, total: data.total })
    }

    // countdown sir — ticks every second while the exam is timed and untaken, auto-submits at zero
    useEffect(() => {
        if (result || secondsLeft === null) return
        const t = setTimeout(() => {
            if (secondsLeft <= 1) handleSubmit()
            else setSecondsLeft(secondsLeft - 1)
        }, 1000)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secondsLeft, result])

    const selectAnswer = (qIndex, optIndex) => {
        if (result) return
        const next = [...answers]
        next[qIndex] = optIndex
        setAnswers(next)
    }

    return (
        <>
            <div className="flex items-start justify-between gap-4 mb-6">
                <h1 className="text-xl font-bold text-richblack-5">{exam.title}</h1>
                {secondsLeft !== null && !result && (
                    <div className="flex items-center gap-1.5 text-sm font-mono text-yellow-50 shrink-0">
                        <FaClock size={12} />
                        {formatSeconds(secondsLeft)}
                    </div>
                )}
            </div>

            <motion.div className="space-y-6" initial="hidden" animate="show" variants={staggerContainer(0.06)}>
                {result && (
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={scaleIn}
                        className="bg-richblack-800 border border-yellow-50 rounded-lg p-4 text-center"
                    >
                        <p className="text-yellow-50 font-bold text-lg">{result.score} / {result.total}</p>
                        <p className="text-richblack-300 text-sm">correct</p>
                    </motion.div>
                )}

                {exam.questions.map((q, qi) => (
                    <motion.div key={q._id || qi} variants={fadeUp}>
                        <p className="text-richblack-5 font-medium mb-2">{qi + 1}. {q.question}</p>
                        <div className="space-y-1">
                            {q.options.map((opt, oi) => {
                                const isSelected = answers[qi] === oi
                                const isCorrect = oi === q.correctIndex
                                const showFeedback = Boolean(result)

                                let classes = "text-richblack-300 border-richblack-700"
                                if (showFeedback && isCorrect) classes = "bg-caribbeangreen-800/20 text-caribbeangreen-300 border-caribbeangreen-300"
                                else if (showFeedback && isSelected && !isCorrect) classes = "bg-pink-200/10 text-pink-200 border-pink-200"
                                else if (!showFeedback && isSelected) classes = "bg-yellow-50/10 text-yellow-50 border-yellow-50"

                                return (
                                    <button
                                        key={oi}
                                        type="button"
                                        disabled={showFeedback}
                                        onClick={() => selectAnswer(qi, oi)}
                                        className={`w-full text-left text-sm px-3 py-2 rounded border cursor-pointer disabled:cursor-default ${classes}`}
                                    >
                                        {opt}
                                    </button>
                                )
                            })}
                        </div>
                        {result && (
                            <p className="text-richblack-400 text-xs mt-2">{q.explanation}</p>
                        )}
                    </motion.div>
                ))}

                {!result && (
                    <motion.button
                        variants={fadeUp}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSubmit}
                        disabled={!allAnswered}
                        className="w-full bg-yellow-50 text-richblack-900 rounded-md py-2 font-semibold disabled:opacity-50 cursor-pointer"
                    >
                        Submit exam
                    </motion.button>
                )}
            </motion.div>
        </>
    )
}

// take-or-review a single practice exam sir — same "answer everything, submit once" shape as
// QuizPlayer, plus a countdown when the exam has a time limit (auto-submits at zero)
const ExamPlayer = () => {
    const { examId } = useParams()
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const { activeExam, loading } = useSelector((state) => state.studyKit)

    useEffect(() => {
        dispatch(setActiveExam(null))
        dispatch(GetExam(examId, token))
    }, [dispatch, examId, token])

    if (loading || !activeExam) return <Loading text="Loading exam..." />

    return (
        <>
            <Helmet><title>{activeExam.title} | Practice Exam</title></Helmet>
            <div className="max-w-3xl mx-auto px-4 py-8">
                <Link to="/Dashboard/Exams" className="inline-flex items-center gap-2 text-richblack-400 hover:text-yellow-50 text-sm mb-6 transition-colors">
                    <FaArrowLeft size={12} /> Back to exams
                </Link>
                {/* key forces a fresh mount (and fresh local state) per exam id sir */}
                <ExamSession key={activeExam._id} exam={activeExam} examId={examId} token={token} />
            </div>
        </>
    )
}

export default ExamPlayer
