import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaFilePdf, FaMicrophone, FaComments } from 'react-icons/fa'

const Banner = () => {
    const { token } = useSelector((state) => state.auth)

    return (
        <div className="max-w-4xl mx-auto text-center px-6 py-20">
            <h1 className="text-4xl md:text-5xl font-bold text-richblack-5 mb-6">
                Turn any notes into a clear summary — <span className="text-yellow-50">instantly</span>
            </h1>
            <p className="text-richblack-200 text-lg mb-8">
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

            <div className="grid md:grid-cols-3 gap-6 mt-16 text-left">
                <div className="border border-richblack-700 rounded-lg p-6">
                    <FaFilePdf className="text-yellow-50 text-2xl mb-3" />
                    <h3 className="text-richblack-5 font-semibold mb-2">Any format</h3>
                    <p className="text-richblack-300 text-sm">Paste text, upload PDF/DOCX/TXT, or type freely — we handle it all.</p>
                </div>
                <div className="border border-richblack-700 rounded-lg p-6">
                    <FaMicrophone className="text-yellow-50 text-2xl mb-3" />
                    <h3 className="text-richblack-5 font-semibold mb-2">Voice input</h3>
                    <p className="text-richblack-300 text-sm">Dictate your notes out loud — your voice becomes text instantly.</p>
                </div>
                <div className="border border-richblack-700 rounded-lg p-6">
                    <FaComments className="text-yellow-50 text-2xl mb-3" />
                    <h3 className="text-richblack-5 font-semibold mb-2">Chat with your notes</h3>
                    <p className="text-richblack-300 text-sm">Ask follow-up questions and get answers grounded in your own notes.</p>
                </div>
            </div>
        </div>
    )
}

export default Banner
