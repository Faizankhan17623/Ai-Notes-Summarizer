import { FaBrain } from 'react-icons/fa'
import FeatureDetailLayout from './FeatureDetailLayout.jsx'

const RATINGS = [
    { label: 'Again', body: "Didn't recall it — the card resets and comes back tomorrow." },
    { label: 'Hard', body: 'Recalled it, but it took real effort — the interval grows only slightly.' },
    { label: 'Good', body: 'Recalled it comfortably — the interval grows at the normal pace.' },
    { label: 'Easy', body: "Recalled it instantly — the interval grows the most, so it's spaced out further." },
]

const SpacedRepetitionFeature = () => (
    <FeatureDetailLayout
        icon={FaBrain}
        accent="violet"
        eyebrow="Spaced Repetition"
        title="Review what you're forgetting, not what you already know"
        intro="Flashcards aren't just generated — they're scheduled. Notewise uses SM-2, the same spaced-repetition algorithm behind Anki and most serious flashcard apps."
    >
        <div className="border border-border-soft rounded-xl bg-surface p-8 mb-12">
            <h2 className="text-richblack-5 font-semibold text-lg mb-3">How the schedule adapts</h2>
            <p className="text-richblack-300 text-sm leading-relaxed mb-4">
                Every time you review a flashcard, you rate how well you recalled it. That rating adjusts two things:
                how soon the card comes back, and an internal "ease" score that keeps tuning the interval over time —
                cards you know well drift further apart, cards you struggle with come back sooner.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
                {RATINGS.map((rating) => (
                    <div key={rating.label} className="border border-border-soft rounded-lg p-4">
                        <h3 className="text-richblack-5 font-semibold text-sm mb-1">{rating.label}</h3>
                        <p className="text-richblack-400 text-xs leading-relaxed">{rating.body}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-border-soft rounded-xl bg-surface p-6">
                <h3 className="text-richblack-5 font-semibold mb-2">A real due queue</h3>
                <p className="text-richblack-300 text-sm leading-relaxed">
                    The Review page only shows cards that are actually due today — no digging through everything
                    you've ever made just to find what needs attention.
                </p>
            </div>
            <div className="border border-border-soft rounded-xl bg-surface p-6">
                <h3 className="text-richblack-5 font-semibold mb-2">Grows with your streak</h3>
                <p className="text-richblack-300 text-sm leading-relaxed">
                    Reviewing counts toward your daily study goal and streak, alongside creating notes and taking
                    quizzes — one consistent measure of showing up.
                </p>
            </div>
            <div className="border border-border-soft rounded-xl bg-surface p-6">
                <h3 className="text-richblack-5 font-semibold mb-2">Included with flashcards</h3>
                <p className="text-richblack-300 text-sm leading-relaxed">
                    Spaced repetition works on any flashcard you generate — no separate setup, no extra cost beyond
                    what your plan already includes for flashcard generation.
                </p>
            </div>
        </div>
    </FeatureDetailLayout>
)

export default SpacedRepetitionFeature
