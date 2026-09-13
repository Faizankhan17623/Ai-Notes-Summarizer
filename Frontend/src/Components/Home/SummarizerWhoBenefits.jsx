import { SUMMARIZER_EXPLAINERS } from './summarizerExplainerData.js'

// Fourth light-themed section per tab — audience cards, no icons, just title + description,
// matching the reference's "Who Can Benefit from the AI [X] Summarizer?" pattern.
const SummarizerWhoBenefits = ({ tab }) => {
    const data = SUMMARIZER_EXPLAINERS[tab] ?? SUMMARIZER_EXPLAINERS.text

    return (
        <div className="bg-white border-t border-neutral-100">
            <div className="max-w-5xl mx-auto px-6 py-20 text-center">
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-neutral-900 mb-14">
                    Who Can Benefit from the <span className="italic text-violet-600">{data.whoBenefitsTitle}</span>?
                </h2>

                <div className="grid md:grid-cols-3 gap-6 text-left">
                    {data.whoBenefits.map((benefit) => (
                        <div key={benefit.title} className="rounded-2xl border border-neutral-200 p-6">
                            <h3 className="font-semibold text-neutral-900 mb-2">{benefit.title}</h3>
                            <p className="text-neutral-500 text-sm leading-relaxed">{benefit.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default SummarizerWhoBenefits
