import { FaComments, FaCheck } from 'react-icons/fa'
import FeatureDetailLayout from './FeatureDetailLayout.jsx'

const HOW_IT_WORKS = [
    { title: 'Open any note', body: "Every summary you generate has a Chat tab — no separate setup, it's already grounded in that note's full text." },
    { title: 'Ask anything about it', body: 'Request clarification, ask for examples, or dig into details that were left out of the summary — answers come only from your note, not the open web.' },
    { title: 'Keep the conversation going', body: "The assistant remembers recent turns in the conversation, so you can ask follow-ups without repeating context." },
]

const PLAN_LIMITS = [
    { plan: 'Basic', messages: '60 messages per chat', context: '10 past turns remembered', extra: 'Light help — for deep study features like quizzes or flashcards, it will point you to Pro/Pro Max' },
    { plan: 'Pro', messages: '200 messages per chat', context: '20 past turns remembered', extra: 'Can generate quiz questions, flashcards, or short practice explanations on request' },
    { plan: 'Pro Max', messages: 'Unlimited messages', context: '40 past turns remembered', extra: 'Full study coach — mock quiz/exam sessions, multi-day study plans, deep explanations' },
]

const NoteGroundedChat = () => (
    <FeatureDetailLayout
        icon={FaComments}
        accent="violet"
        eyebrow="Note-grounded Chat"
        title="A chat partner that actually knows your notes"
        intro="Every summary comes with a conversation grounded in the exact text you submitted — not a generic web search, not a guess. Ask it anything about your own material."
    >
        <div className="space-y-6 mb-16">
            {HOW_IT_WORKS.map((step, i) => (
                <div key={step.title} className="border border-border-soft rounded-xl bg-surface p-6 flex gap-5 items-start">
                    <span className="shrink-0 w-9 h-9 rounded-full bg-violet-400/10 text-violet-400 flex items-center justify-center font-mono font-semibold text-sm">
                        {i + 1}
                    </span>
                    <div>
                        <h3 className="text-richblack-5 font-semibold mb-1">{step.title}</h3>
                        <p className="text-richblack-300 text-sm leading-relaxed">{step.body}</p>
                    </div>
                </div>
            ))}
        </div>

        <h2 className="font-display text-2xl font-semibold text-richblack-5 mb-6 text-center">What each plan gets</h2>
        <div className="grid md:grid-cols-3 gap-4">
            {PLAN_LIMITS.map((row) => (
                <div key={row.plan} className="border border-border-soft rounded-xl bg-surface p-6">
                    <h3 className="text-richblack-5 font-semibold mb-3">{row.plan}</h3>
                    <ul className="space-y-2 text-sm text-richblack-200">
                        <li className="flex items-start gap-2"><FaCheck className="text-good mt-1 shrink-0" size={11} /> {row.messages}</li>
                        <li className="flex items-start gap-2"><FaCheck className="text-good mt-1 shrink-0" size={11} /> {row.context}</li>
                    </ul>
                    <p className="text-richblack-400 text-xs mt-3 leading-relaxed">{row.extra}</p>
                </div>
            ))}
        </div>
    </FeatureDetailLayout>
)

export default NoteGroundedChat
