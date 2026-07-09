import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AttemptQuiz } from '../../Services/operations/StudyKit.js'

// take-the-quiz view sir — one question at a time, submits all answers together at the end
const QuizPlayer = ({ quiz }) => {
    const dispatch = useDispatch()
    const { token } = useSelector((state) => state.auth)
    const [answers, setAnswers] = useState(Array(quiz.questions.length).fill(null))
    const [result, setResult] = useState(quiz.lastAttempt?.total ? quiz.lastAttempt : null)

    const selectAnswer = (qIndex, optIndex) => {
        if (result) return
        const next = [...answers]
        next[qIndex] = optIndex
        setAnswers(next)
    }

    const handleSubmit = async () => {
        const data = await dispatch(AttemptQuiz(quiz._id, answers, token))
        if (data) setResult({ score: data.score, total: data.total })
    }

    const allAnswered = answers.every((a) => a !== null)

    return (
        <div className="space-y-6">
            {result && (
                <div className="bg-richblack-800 border border-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-yellow-50 font-bold text-lg">{result.score} / {result.total}</p>
                    <p className="text-richblack-300 text-sm">correct</p>
                </div>
            )}

            {quiz.questions.map((q, qi) => (
                <div key={q._id || qi}>
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
                    {result && <p className="text-richblack-400 text-xs mt-2">{q.explanation}</p>}
                </div>
            ))}

            {!result && (
                <button
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                    className="w-full bg-yellow-50 text-richblack-900 rounded-md py-2 font-semibold disabled:opacity-50 cursor-pointer"
                >
                    Submit
                </button>
            )}
        </div>
    )
}

export default QuizPlayer
