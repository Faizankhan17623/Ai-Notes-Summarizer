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
import NoStaffRoute from './Hooks/NoStaffRoute'
import ScrollToTop from './Components/extra/ScrollToTop'
import AnnouncementBanner from './Components/extra/AnnouncementBanner'
import CookieConsent from './Components/extra/CookieConsent'
import ProMaxPlanNotice from './Components/extra/ProMaxPlanNotice'
import CommandPalette from './Components/extra/CommandPalette'
import { pageTransition } from './Components/extra/motionVariants.js'
import { FetchCsrfToken } from './Services/operations/Auth.js'
import { wakeUpServer } from './utils/wakeUpServer.js'
import { logVisit } from './utils/logVisit.js'

// Lazy-loaded route components sir — split into separate chunks for faster initial load
const Join = lazy(() => import('./Components/UserCreation/Join'))
const OTP = lazy(() => import('./Components/UserCreation/OTP'))
const Login = lazy(() => import('./Components/Login/User'))
const Verify2FA = lazy(() => import('./Components/Login/Verify2FA'))
// OAuth social login temporarily disabled sir — see Login/User.jsx's same-note comment
// const OAuthCallback = lazy(() => import('./Components/Login/OAuthCallback'))
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
const SearchResults = lazy(() => import('./Components/Dashboard/SearchResults'))
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

// Fades/slides each top-level route in on mount sir — self-keyed by pathname so
// AnimatePresence (wrapping the whole <Routes> below) still treats navigation between
// STANDALONE pages as an exit+enter pair. Pages nested inside a persistent sidebar layout
// (Dashboard/Admin/Support) don't use this — see AnimatedOutlet.jsx, which animates just
// the Outlet content so the sidebar around it never remounts.
const PageFade = ({ children }) => {
  const location = useLocation()
  return (
    <motion.div key={location.pathname} initial="initial" animate="animate" exit="exit" variants={pageTransition}>
      {children}
    </motion.div>
  )
}

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
      <CommandPalette />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location}>
            {/* Public sir */}
            <Route path="/" element={<Homelayout />} />
            <Route path="/Pricing" element={<NoStaffRoute><PageFade><Pricing /></PageFade></NoStaffRoute>} />
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
            <Route path="/Verify-2FA" element={<OpenRoute><PageFade><Verify2FA /></PageFade></OpenRoute>} />
            {/* <Route path="/oauth/callback" element={<OpenRoute><PageFade><OAuthCallback /></PageFade></OpenRoute>} /> — OAuth temporarily disabled sir, see Login/User.jsx */}
            <Route path="/forgot-password" element={<OpenRoute><PageFade><ForgotPassword /></PageFade></OpenRoute>} />
            <Route path="/reset-password/:token" element={<OpenRoute><PageFade><ResetPassword /></PageFade></OpenRoute>} />

            {/* Only for the logged-IN sir — one shared sidebar shell via Outlet instead of every
                page rendering its own Navbar */}
            <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route path="/Dashboard" element={<DashboardHome />} />
              <Route path="/Dashboard/New-Summary" element={<NewSummary />} />
              <Route path="/Dashboard/Articles" element={<Articles />} />
              <Route path="/Dashboard/Note/:noteId" element={<Report />} />
              <Route path="/Dashboard/Review" element={<Review />} />
              <Route path="/Dashboard/History" element={<History />} />
              <Route path="/Dashboard/Chats" element={<Chat />} />
              <Route path="/Dashboard/Chat/:chatId" element={<Chat />} />
              <Route path="/Dashboard/Search" element={<SearchResults />} />
              <Route path="/Dashboard/Account" element={<Account />} />
            </Route>

            {/* Admin only sir — Support has its own completely separate dashboard below, not a
                filtered view of this one. The backend re-checks the role on every call anyway. */}
            <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route path="/Admin" element={<AdminOverview />} />
              <Route path="/Admin/Analytics" element={<AdminAnalytics />} />
              <Route path="/Admin/Traffic" element={<AdminTraffic />} />
              <Route path="/Admin/Users" element={<AdminUsers />} />
              <Route path="/Admin/Payments" element={<AdminPayments />} />
              <Route path="/Admin/Messages" element={<AdminContactMessages />} />
              <Route path="/Admin/Audit" element={<AdminAudit />} />
              <Route path="/Admin/Announcements" element={<AdminAnnouncements />} />
            </Route>

            {/* Support only sir — its own dashboard at /Support, reusing the same Overview/Users/
                Payments components (they're role-agnostic, read from the same Redux state and
                hit the same endpoints Support is allowed to call) but never AdminLayout's shell
                or its Admin-only tabs */}
            <Route element={<SupportRoute><SupportLayout /></SupportRoute>}>
              <Route path="/Support" element={<AdminOverview />} />
              <Route path="/Support/Users" element={<AdminUsers />} />
              <Route path="/Support/Payments" element={<AdminPayments />} />
              <Route path="/Support/Messages" element={<AdminContactMessages />} />
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
