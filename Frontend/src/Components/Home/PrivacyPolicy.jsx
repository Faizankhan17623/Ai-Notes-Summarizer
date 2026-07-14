import { Helmet } from 'react-helmet-async'
import MarketingLayout from './MarketingLayout.jsx'

const SUPPORT_EMAIL = 'faizankhan901152@gmail.com'

const PrivacyPolicy = () => (
    <MarketingLayout>
        <Helmet><title>Privacy Policy — Notewise</title></Helmet>

        <div className="max-w-3xl mx-auto px-6 py-20">
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-richblack-5 mb-2">Privacy Policy</h1>
            <p className="text-richblack-400 text-sm mb-12">Last updated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <div className="space-y-8 text-richblack-200 leading-relaxed">
                <section>
                    <h2 className="text-richblack-5 font-semibold text-lg mb-2">What we collect</h2>
                    <p>
                        We collect the information you give us directly: your name and email when you sign up, and the
                        notes, files, and text you submit to be summarized. We also store the summaries, flashcards,
                        quizzes, and chat messages generated from that content so you can access them later.
                    </p>
                </section>

                <section>
                    <h2 className="text-richblack-5 font-semibold text-lg mb-2">How we use it</h2>
                    <p>
                        Your notes are sent to our AI provider solely to generate the summary, chat response, flashcards,
                        or quiz you requested. We use your email to send account-related messages — sign-up verification,
                        password resets, and account deletion confirmations. We do not sell your data or share it with
                        advertisers.
                    </p>
                </section>

                <section>
                    <h2 className="text-richblack-5 font-semibold text-lg mb-2">Sharing your notes</h2>
                    <p>
                        Notes stay private by default. If you enable a share link on a note, anyone with that link can
                        view a read-only version of it — you can disable the link at any time to revoke access.
                    </p>
                </section>

                <section>
                    <h2 className="text-richblack-5 font-semibold text-lg mb-2">Payment information</h2>
                    <p>
                        Subscription and credit-pack payments are processed by Razorpay. We do not store your card or
                        payment details on our servers — Razorpay handles that directly.
                    </p>
                </section>

                <section>
                    <h2 className="text-richblack-5 font-semibold text-lg mb-2">Data retention and deletion</h2>
                    <p>
                        You can delete your account at any time from Account settings. Deletion is held for a 2-day
                        recovery window, after which your notes and account data are permanently removed.
                    </p>
                </section>

                <section>
                    <h2 className="text-richblack-5 font-semibold text-lg mb-2">Contact</h2>
                    <p>
                        Questions about this policy or your data? Email us at{' '}
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-yellow-50 hover:underline">{SUPPORT_EMAIL}</a>.
                    </p>
                </section>
            </div>
        </div>
    </MarketingLayout>
)

export default PrivacyPolicy
