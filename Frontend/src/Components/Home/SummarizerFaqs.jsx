import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FaPlus } from 'react-icons/fa'
import { SUMMARIZER_EXPLAINERS } from './summarizerExplainerData.js'

const FaqItem = ({ q, a, isOpen, onToggle }) => {
    return (
        <div className={`border-b border-neutral-200 transition-colors ${isOpen ? 'bg-violet-50/40' : 'hover:bg-neutral-50'}`}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 py-6 px-4 text-left cursor-pointer"
            >
                <span className={`font-semibold transition-colors ${isOpen ? 'text-violet-600' : 'text-neutral-900'}`}>{q}</span>
                <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${isOpen ? 'bg-violet-600 border-violet-600' : 'bg-white border-neutral-300'}`}
                >
                    <FaPlus size={12} className={isOpen ? 'text-white' : 'text-neutral-500'} />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <p className="text-neutral-500 text-sm leading-relaxed px-4 pb-6 pr-10">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Fifth light-themed section per tab — interactive FAQ accordion (animated expand/collapse,
// active-question highlight), questions genuinely different per tab, not reused copy.
const SummarizerFaqs = ({ tab }) => {
    const data = SUMMARIZER_EXPLAINERS[tab] ?? SUMMARIZER_EXPLAINERS.text
    const [openIndex, setOpenIndex] = useState(0)

    useEffect(() => {
        setOpenIndex(0)
    }, [tab])

    return (
        <div className="bg-white border-t border-neutral-100">
            <div className="max-w-5xl mx-auto px-6 py-20">
                <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-14">
                    <div>
                        <h2 className="font-display text-4xl font-semibold text-neutral-900 mb-4">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-neutral-500">
                            Everything you need to know about the product and billing.
                        </p>
                    </div>

                    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                        {data.faqs.map((faq, i) => (
                            <FaqItem
                                key={faq.q}
                                q={faq.q}
                                a={faq.a}
                                isOpen={openIndex === i}
                                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SummarizerFaqs
