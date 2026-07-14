import { FaLayerGroup, FaCheck, FaMinus } from 'react-icons/fa'
import FeatureDetailLayout from './FeatureDetailLayout.jsx'

const HOW_IT_WORKS = [
    { title: 'Summarize a note on Pro Max', body: 'Flashcards and a scored quiz are generated automatically alongside every summary — 6-10 flashcards and 5-8 quiz questions, grounded strictly in your notes.' },
    { title: 'Or generate more on request', body: 'Need extra cards or questions beyond the initial set? Generate more from the note at any time, without duplicating what you already have.' },
    { title: 'Review and get scored', body: 'Quiz questions are multiple-choice with four options and a short explanation of why the correct answer is right — no vague "correct/incorrect" with nothing to learn from.' },
]

const PLAN_GATING = [
    { plan: 'Basic', flashcards: false, quiz: false },
    { plan: 'Pro', flashcards: false, quiz: false },
    { plan: 'Pro Max', flashcards: true, quiz: true },
]

const FlashcardsAndQuizzes = () => (
    <FeatureDetailLayout
        icon={FaLayerGroup}
        accent="yellow"
        eyebrow="Flashcards & Quizzes"
        title="Turn any note into study material, automatically"
        intro="No manual card-writing. Flashcards for active recall and a scored multiple-choice quiz with explanations are generated straight from your notes."
    >
        <div className="space-y-6 mb-16">
            {HOW_IT_WORKS.map((step, i) => (
                <div key={step.title} className="border border-border-soft rounded-xl bg-surface p-6 flex gap-5 items-start">
                    <span className="shrink-0 w-9 h-9 rounded-full bg-yellow-50/10 text-yellow-50 flex items-center justify-center font-mono font-semibold text-sm">
                        {i + 1}
                    </span>
                    <div>
                        <h3 className="text-richblack-5 font-semibold mb-1">{step.title}</h3>
                        <p className="text-richblack-300 text-sm leading-relaxed">{step.body}</p>
                    </div>
                </div>
            ))}
        </div>

        <h2 className="font-display text-2xl font-semibold text-richblack-5 mb-6 text-center">Plan availability</h2>
        <div className="grid grid-cols-3 gap-4">
            {PLAN_GATING.map((row) => (
                <div key={row.plan} className="border border-border-soft rounded-xl bg-surface p-6 text-center">
                    <h3 className="text-richblack-5 font-semibold mb-4">{row.plan}</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-center gap-2 text-richblack-200">
                            {row.flashcards ? <FaCheck className="text-good" size={12} /> : <FaMinus className="text-richblack-500" size={11} />}
                            Flashcards
                        </div>
                        <div className="flex items-center justify-center gap-2 text-richblack-200">
                            {row.quiz ? <FaCheck className="text-good" size={12} /> : <FaMinus className="text-richblack-500" size={11} />}
                            Quiz
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <p className="text-richblack-400 text-xs text-center mt-4">
            Flashcard and quiz generation is included as part of the Pro Max plan's credit allowance — no separate add-on required.
        </p>
    </FeatureDetailLayout>
)

export default FlashcardsAndQuizzes
