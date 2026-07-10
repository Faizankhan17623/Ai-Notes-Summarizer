import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaFilePdf, FaMicrophone, FaComments } from 'react-icons/fa'

const Banner = () => {
    const { token } = useSelector((state) => state.auth)

    return (
        <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
                <div>
                    <h1 className="font-display text-4xl md:text-5xl font-light leading-tight text-richblack-5 mb-6">
                        Messy notes in.<br />A clear <span className="font-semibold text-yellow-50">summary</span> out.
                    </h1>
                    <p className="text-richblack-200 text-lg mb-8 max-w-xl">
                        Paste text, upload a PDF/Word/TXT file, or just talk — our AI reads your meeting notes,
                        lecture notes or freeform thoughts and gives you a structured summary, key points, and a chat
                        partner who knows exactly what's in them.
                    </p>

                    <Link
                        to={token ? "/Dashboard/New-Summary" : "/Signup"}
                        className="inline-block bg-yellow-50 text-richblack-900 px-8 py-3 rounded-md font-semibold hover:scale-95 transition-all"
                    >
                        {token ? "Summarize your notes" : "Get started for free"}
                    </Link>
                </div>

                <div className="border border-border-soft rounded-xl bg-surface-raised p-1.5">
                    <div className="rounded-lg bg-surface p-5">
                        <div className="flex gap-1.5 mb-4">
                            <span className="w-2 h-2 rounded-full bg-border-soft" />
                            <span className="w-2 h-2 rounded-full bg-border-soft" />
                            <span className="w-2 h-2 rounded-full bg-border-soft" />
                        </div>
                        <div className="h-2 rounded bg-border-soft w-4/5 mb-2" />
                        <div className="h-2 rounded bg-border-soft w-full mb-2" />
                        <div className="h-2 rounded bg-border-soft w-3/5 mb-4" />
                        <div className="border border-yellow-50/30 bg-yellow-50/10 rounded-lg p-4">
                            <span className="block text-[10px] uppercase tracking-wide text-yellow-50 font-semibold mb-2">TL;DR</span>
                            <p className="text-richblack-200 text-sm leading-relaxed">
                                Q3 roadmap prioritizes the mobile app rewrite before the billing overhaul; design review moved to Thursday.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-16 text-left">
                <div className="border border-border-soft rounded-lg p-6 bg-surface">
                    <FaFilePdf className="text-yellow-50 text-2xl mb-3" />
                    <h3 className="text-richblack-5 font-semibold mb-2">Any format</h3>
                    <p className="text-richblack-300 text-sm">Paste text, upload PDF/DOCX/TXT, or type freely — we handle it all.</p>
                </div>
                <div className="border border-border-soft rounded-lg p-6 bg-surface">
                    <FaMicrophone className="text-yellow-50 text-2xl mb-3" />
                    <h3 className="text-richblack-5 font-semibold mb-2">Voice input</h3>
                    <p className="text-richblack-300 text-sm">Dictate your notes out loud — your voice becomes text instantly.</p>
                </div>
                <div className="border border-border-soft rounded-lg p-6 bg-surface">
                    <FaComments className="text-yellow-50 text-2xl mb-3" />
                    <h3 className="text-richblack-5 font-semibold mb-2">Chat with your notes</h3>
                    <p className="text-richblack-300 text-sm">Ask follow-up questions and get answers grounded in your own notes.</p>
                </div>
            </div>
        </div>
    )
}

export default Banner
