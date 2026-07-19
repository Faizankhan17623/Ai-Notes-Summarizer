import { lazy, Suspense, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { Helmet } from 'react-helmet-async'
import { AnimatePresence, motion } from 'motion/react'
import Navbar from './Components/Home/Navbar'
import Banner from './Components/Home/Banner'
import Footer from './Components/Home/Footer'
import OpenRoute from './Hooks/OpenRoute'
import PrivateRoute from './Hooks/PrivateRoute'
import AdminRoute from './Hooks/AdminRoute'
import SupportRoute from './Hooks/SupportRoute'
import ScrollToTop from './Components/extra/ScrollToTop'
import AnnouncementBanner from './Components/extra/AnnouncementBanner'
import CookieConsent from './Components/extra/CookieConsent'
import ProMaxPlanNotice from './Components/extra/ProMaxPlanNotice'
import { pageTransition } from './Components/extra/motionVariants.js'
import { FetchCsrfToken } from './Services/operations/Auth.js'
import { wakeUpServer } from './utils/wakeUpServer.js'
import { logVisit } from './utils/logVisit.js'

// Lazy-loaded route components sir — split into separate chunks for faster initial load
const Join = lazy(() => import('./Components/UserCreation/Join'))
const OTP = lazy(() => import('./Components/UserCreation/OTP'))
const Login = lazy(() => import('./Components/Login/User'))
const ForgotPassword = lazy(() => import('./Components/Login/ForgotPassword'))
const ResetPassword = lazy(() => import('./Components/Login/ResetPassword'))
const Pricing = lazy(() => import('./Components/Home/Pricing'))
const Features = lazy(() => import('./Components/Home/Features'))
const Solutions = lazy(() => import('./Components/Home/Solutions'))
const Resources = lazy(() => import('./Components/Home/Resources'))
const HelpCenter = lazy(() => import('./Components/Home/HelpCenter'))
const PrivacyPolicy = lazy(() => import('./Components/Home/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./Components/Home/TermsOfService'))
const Contact = lazy(() => import('./Components/Home/Contact'))
const NoteGroundedChat = lazy(() => import('./Components/Home/NoteGroundedChat'))
const FlashcardsAndQuizzes = lazy(() => import('./Components/Home/FlashcardsAndQuizzes'))
const SpacedRepetitionFeature = lazy(() => import('./Components/Home/SpacedRepetitionFeature'))
const DashboardLayout = lazy(() => import('./Components/Dashboard/DashboardLayout'))
const DashboardHome = lazy(() => import('./Components/Dashboard/DashboardHome'))
const NewSummary = lazy(() => import('./Components/Dashboard/NewSummary'))
const Articles = lazy(() => import('./Components/Dashboard/Articles'))
const Report = lazy(() => import('./Components/Dashboard/Report'))
const SharedNote = lazy(() => import('./Components/Dashboard/SharedNote'))
const Review = lazy(() => import('./Components/Dashboard/Review'))
const History = lazy(() => import('./Components/Dashboard/History'))
const Chat = lazy(() => import('./Components/Dashboard/Chat'))
const Account = lazy(() => import('./Components/Dashboard/Account'))
const AdminLayout = lazy(() => import('./Components/Admin/AdminLayout'))
const AdminOverview = lazy(() => import('./Components/Admin/Overview'))
const AdminAnalytics = lazy(() => import('./Components/Admin/Analytics'))
const AdminTraffic = lazy(() => import('./Components/Admin/Traffic'))
const AdminUsers = lazy(() => import('./Components/Admin/Users'))
const AdminPayments = lazy(() => import('./Components/Admin/Payments'))
const AdminAudit = lazy(() => import('./Components/Admin/Audit'))
const AdminAnnouncements = lazy(() => import('./Components/Admin/Announcements'))
const AdminContactMessages = lazy(() => import('./Components/Admin/ContactMessages'))
const SupportLayout = lazy(() => import('./Components/Support/SupportLayout'))

const PageLoader = () => (
  <div className="min-h-screen bg-richblack-900 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-yellow-50 border-t-transparent rounded-full animate-spin" />
  </div>
)

// Fades/slides each route in on mount sir — keyed by pathname below so AnimatePresence
// treats every navigation as an exit+enter pair instead of a silent swap.
const PageFade = ({ children }) => (
  <motion.div initial="initial" animate="animate" exit="exit" variants={pageTransition}>
    {children}
  </motion.div>
)

const Homelayout = () => {
  return (
    <div className="bg-richblack-900 min-h-screen flex flex-col">
      <Helmet>
        <title>Notewise — turn any notes into clear summaries</title>
      </Helmet>
      <Navbar showMegaMenu />
      <div className="flex-1">
        <Banner />
      </div>
      <Footer />
    </div>
  )
}

function App() {
  const dispatch = useDispatch()
  const location = useLocation()

  useEffect(() => {
    // Fire both in PARALLEL sir — the CSRF fetch itself also wakes the server (on a cold
    // start it simply hangs until the boot finishes, then succeeds). Chaining it after
    // wakeUpServer() was a bug: ad-blockers block /health (ERR_BLOCKED_BY_CLIENT), so the
    // retry loop burned ~15s before the CSRF token was ever fetched, and any summarize
    // clicked in that window 403'd with "Invalid or missing CSRF token".
    wakeUpServer()
    dispatch(FetchCsrfToken())
  }, [dispatch])

  // one ping per route change sir — powers the admin Traffic dashboard's unique-visitor
  // and page-view charts. Fire-and-forget, never blocks or affects the page transition above.
  useEffect(() => {
    logVisit(location.pathname)
  }, [location.pathname])

  return (
    <>
      <AnnouncementBanner />
      <ProMaxPlanNotice />
      <CookieConsent />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            {/* Public sir */}
            <Route path="/" element={<Homelayout />} />
            <Route path="/Pricing" element={<PageFade><Pricing /></PageFade>} />
            <Route path="/Features" element={<PageFade><Features /></PageFade>} />
            <Route path="/Solutions" element={<PageFade><Solutions /></PageFade>} />
            <Route path="/Resources" element={<PageFade><Resources /></PageFade>} />
            <Route path="/HelpCenter" element={<PageFade><HelpCenter /></PageFade>} />
            <Route path="/PrivacyPolicy" element={<PageFade><PrivacyPolicy /></PageFade>} />
            <Route path="/TermsOfService" element={<PageFade><TermsOfService /></PageFade>} />
            <Route path="/Contact" element={<PageFade><Contact /></PageFade>} />
            <Route path="/Features/Chat" element={<PageFade><NoteGroundedChat /></PageFade>} />
            <Route path="/Features/FlashcardsAndQuizzes" element={<PageFade><FlashcardsAndQuizzes /></PageFade>} />
            <Route path="/Features/SpacedRepetition" element={<PageFade><SpacedRepetitionFeature /></PageFade>} />
            <Route path="/shared/:shareId" element={<PageFade><SharedNote /></PageFade>} />

            {/* Only for the logged-OUT sir */}
            <Route path="/Signup" element={<OpenRoute><PageFade><Join /></PageFade></OpenRoute>} />
            <Route path="/Verify-Otp" element={<OpenRoute><PageFade><OTP /></PageFade></OpenRoute>} />
            <Route path="/Login" element={<OpenRoute><PageFade><Login /></PageFade></OpenRoute>} />
            <Route path="/forgot-password" element={<OpenRoute><PageFade><ForgotPassword /></PageFade></OpenRoute>} />
            <Route path="/reset-password/:token" element={<OpenRoute><PageFade><ResetPassword /></PageFade></OpenRoute>} />

            {/* Only for the logged-IN sir — one shared sidebar shell via Outlet instead of every
                page rendering its own Navbar */}
            <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route path="/Dashboard" element={<PageFade><DashboardHome /></PageFade>} />
              <Route path="/Dashboard/New-Summary" element={<PageFade><NewSummary /></PageFade>} />
              <Route path="/Dashboard/Articles" element={<PageFade><Articles /></PageFade>} />
              <Route path="/Dashboard/Note/:noteId" element={<PageFade><Report /></PageFade>} />
              <Route path="/Dashboard/Review" element={<PageFade><Review /></PageFade>} />
              <Route path="/Dashboard/History" element={<PageFade><History /></PageFade>} />
              <Route path="/Dashboard/Chats" element={<PageFade><Chat /></PageFade>} />
              <Route path="/Dashboard/Chat/:chatId" element={<PageFade><Chat /></PageFade>} />
              <Route path="/Dashboard/Account" element={<PageFade><Account /></PageFade>} />
            </Route>

            {/* Admin only sir — Support has its own completely separate dashboard below, not a
                filtered view of this one. The backend re-checks the role on every call anyway. */}
            <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route path="/Admin" element={<PageFade><AdminOverview /></PageFade>} />
              <Route path="/Admin/Analytics" element={<PageFade><AdminAnalytics /></PageFade>} />
              <Route path="/Admin/Traffic" element={<PageFade><AdminTraffic /></PageFade>} />
              <Route path="/Admin/Users" element={<PageFade><AdminUsers /></PageFade>} />
              <Route path="/Admin/Payments" element={<PageFade><AdminPayments /></PageFade>} />
              <Route path="/Admin/Messages" element={<PageFade><AdminContactMessages /></PageFade>} />
              <Route path="/Admin/Audit" element={<PageFade><AdminAudit /></PageFade>} />
              <Route path="/Admin/Announcements" element={<PageFade><AdminAnnouncements /></PageFade>} />
            </Route>

            {/* Support only sir — its own dashboard at /Support, reusing the same Overview/Users/
                Payments components (they're role-agnostic, read from the same Redux state and
                hit the same endpoints Support is allowed to call) but never AdminLayout's shell
                or its Admin-only tabs */}
            <Route element={<SupportRoute><SupportLayout /></SupportRoute>}>
              <Route path="/Support" element={<PageFade><AdminOverview /></PageFade>} />
              <Route path="/Support/Users" element={<PageFade><AdminUsers /></PageFade>} />
              <Route path="/Support/Payments" element={<PageFade><AdminPayments /></PageFade>} />
              <Route path="/Support/Messages" element={<PageFade><AdminContactMessages /></PageFade>} />
            </Route>

            {/* anything unknown goes home sir */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  )
}

export default App
