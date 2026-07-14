import { lazy, Suspense, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Routes, Route, Navigate } from "react-router-dom"
import { Helmet } from 'react-helmet-async'
import Navbar from './Components/Home/Navbar'
import Banner from './Components/Home/Banner'
import Footer from './Components/Home/Footer'
import OpenRoute from './Hooks/OpenRoute'
import PrivateRoute from './Hooks/PrivateRoute'
import AdminRoute from './Hooks/AdminRoute'
import ScrollToTop from './Components/extra/ScrollToTop'
import AnnouncementBanner from './Components/extra/AnnouncementBanner'
import { FetchCsrfToken } from './Services/operations/Auth.js'

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
const NoteGroundedChat = lazy(() => import('./Components/Home/NoteGroundedChat'))
const FlashcardsAndQuizzes = lazy(() => import('./Components/Home/FlashcardsAndQuizzes'))
const SpacedRepetitionFeature = lazy(() => import('./Components/Home/SpacedRepetitionFeature'))
const DashboardLayout = lazy(() => import('./Components/Dashboard/DashboardLayout'))
const DashboardHome = lazy(() => import('./Components/Dashboard/DashboardHome'))
const NewSummary = lazy(() => import('./Components/Dashboard/NewSummary'))
const Report = lazy(() => import('./Components/Dashboard/Report'))
const SharedNote = lazy(() => import('./Components/Dashboard/SharedNote'))
const Review = lazy(() => import('./Components/Dashboard/Review'))
const History = lazy(() => import('./Components/Dashboard/History'))
const Chat = lazy(() => import('./Components/Dashboard/Chat'))
const Account = lazy(() => import('./Components/Dashboard/Account'))
const AdminLayout = lazy(() => import('./Components/Admin/AdminLayout'))
const AdminOverview = lazy(() => import('./Components/Admin/Overview'))
const AdminAnalytics = lazy(() => import('./Components/Admin/Analytics'))
const AdminUsers = lazy(() => import('./Components/Admin/Users'))
const AdminPayments = lazy(() => import('./Components/Admin/Payments'))
const AdminAudit = lazy(() => import('./Components/Admin/Audit'))
const AdminAnnouncements = lazy(() => import('./Components/Admin/Announcements'))

const PageLoader = () => (
  <div className="min-h-screen bg-richblack-900 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-yellow-50 border-t-transparent rounded-full animate-spin" />
  </div>
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

  useEffect(() => {
    dispatch(FetchCsrfToken())
  }, [dispatch])

  return (
    <>
      <AnnouncementBanner />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public sir */}
          <Route path="/" element={<Homelayout />} />
          <Route path="/Pricing" element={<Pricing />} />
          <Route path="/Features" element={<Features />} />
          <Route path="/Solutions" element={<Solutions />} />
          <Route path="/Resources" element={<Resources />} />
          <Route path="/HelpCenter" element={<HelpCenter />} />
          <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
          <Route path="/TermsOfService" element={<TermsOfService />} />
          <Route path="/Features/Chat" element={<NoteGroundedChat />} />
          <Route path="/Features/FlashcardsAndQuizzes" element={<FlashcardsAndQuizzes />} />
          <Route path="/Features/SpacedRepetition" element={<SpacedRepetitionFeature />} />
          <Route path="/shared/:shareId" element={<SharedNote />} />

          {/* Only for the logged-OUT sir */}
          <Route path="/Signup" element={<OpenRoute><Join /></OpenRoute>} />
          <Route path="/Verify-Otp" element={<OpenRoute><OTP /></OpenRoute>} />
          <Route path="/Login" element={<OpenRoute><Login /></OpenRoute>} />
          <Route path="/forgot-password" element={<OpenRoute><ForgotPassword /></OpenRoute>} />
          <Route path="/reset-password/:token" element={<OpenRoute><ResetPassword /></OpenRoute>} />

          {/* Only for the logged-IN sir — one shared sidebar shell via Outlet instead of every
              page rendering its own Navbar */}
          <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route path="/Dashboard" element={<DashboardHome />} />
            <Route path="/Dashboard/New-Summary" element={<NewSummary />} />
            <Route path="/Dashboard/Note/:noteId" element={<Report />} />
            <Route path="/Dashboard/Review" element={<Review />} />
            <Route path="/Dashboard/History" element={<History />} />
            <Route path="/Dashboard/Chats" element={<Chat />} />
            <Route path="/Dashboard/Chat/:chatId" element={<Chat />} />
            <Route path="/Dashboard/Account" element={<Account />} />
          </Route>

          {/* Admin and Support only sir — the backend re-checks the role on every call anyway.
              One shared sidebar shell via Outlet instead of every page rendering its own Navbar+AdminNav */}
          <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="/Admin" element={<AdminOverview />} />
            <Route path="/Admin/Analytics" element={<AdminAnalytics />} />
            <Route path="/Admin/Users" element={<AdminUsers />} />
            <Route path="/Admin/Payments" element={<AdminPayments />} />
            <Route path="/Admin/Audit" element={<AdminAudit />} />
            <Route path="/Admin/Announcements" element={<AdminAnnouncements />} />
          </Route>

          {/* anything unknown goes home sir */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
