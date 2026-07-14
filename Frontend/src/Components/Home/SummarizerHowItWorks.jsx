import { SUMMARIZER_EXPLAINERS } from './summarizerExplainerData.js'

// Matches the reference design's light pastel "islands" — deliberately not dark-themed,
// these three colors (amber/rose/violet) are what distinguish steps 1/2/3 at a glance.
const STEP_STYLES = [
    { bg: 'bg-amber-50', badgeBg: 'bg-amber-100', text: 'text-neutral-800', body: 'text-neutral-600' },
    { bg: 'bg-rose-50', badgeBg: 'bg-rose-100', text: 'text-neutral-800', body: 'text-neutral-600' },
    { bg: 'bg-violet-100', badgeBg: 'bg-violet-200', text: 'text-neutral-800', body: 'text-neutral-600' },
]

const SummarizerHowItWorks = ({ tab }) => {
    const data = SUMMARIZER_EXPLAINERS[tab] ?? SUMMARIZER_EXPLAINERS.text

    return (
        <div className="bg-white">
            <div className="max-w-5xl mx-auto px-6 py-20 text-center">
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-neutral-900 mb-4">
                    How Does the <span className="italic text-violet-600">{data.howTitle}</span> Work?
                </h2>
                <p className="text-neutral-500 mb-14">{data.howSubtitle}</p>

                <div className="grid md:grid-cols-3 gap-6">
                    {data.steps.map((step, i) => {
                        const style = STEP_STYLES[i]
                        return (
                            <div key={step.title} className={`relative rounded-2xl ${style.bg} pt-14 pb-10 px-8`}>
                                <span className={`absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full ${style.badgeBg} flex items-center justify-center text-2xl font-bold ${style.text} border-4 border-white shadow-sm`}>
                                    {i + 1}
                                </span>
                                <h3 className={`font-semibold text-lg mb-3 ${style.text}`}>{step.title}</h3>
                                <p className={`text-sm leading-relaxed ${style.body}`}>{step.body}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default SummarizerHowItWorks
