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
import DevBanner from './Components/extra/DevBanner'
import { FetchCsrfToken } from './Services/operations/Auth.js'

// Lazy-loaded route components sir — split into separate chunks for faster initial load
const Join = lazy(() => import('./Components/UserCreation/Join'))
const OTP = lazy(() => import('./Components/UserCreation/OTP'))
const Login = lazy(() => import('./Components/Login/User'))
const ForgotPassword = lazy(() => import('./Components/Login/ForgotPassword'))
const ResetPassword = lazy(() => import('./Components/Login/ResetPassword'))
const Pricing = lazy(() => import('./Components/Home/Pricing'))
const DashboardLayout = lazy(() => import('./Components/Dashboard/DashboardLayout'))
const DashboardHome = lazy(() => import('./Components/Dashboard/DashboardHome'))
const NewSummary = lazy(() => import('./Components/Dashboard/NewSummary'))
const Report = lazy(() => import('./Components/Dashboard/Report'))
const SharedNote = lazy(() => import('./Components/Dashboard/SharedNote'))
const Review = lazy(() => import('./Components/Dashboard/Review'))
const History = lazy(() => import('./Components/Dashboard/History'))
const Chat = lazy(() => import('./Components/Dashboard/Chat'))
const Account = lazy(() => import('./Components/Dashboard/Account'))
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
        <title>AI Notes Summarizer — turn any notes into clear summaries</title>
      </Helmet>
      <Navbar />
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
      <DevBanner />
      <AnnouncementBanner />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public sir */}
          <Route path="/" element={<Homelayout />} />
          <Route path="/Pricing" element={<Pricing />} />
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

          {/* Admin and Support only sir — the backend re-checks the role on every call anyway */}
          <Route path="/Admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
          <Route path="/Admin/Analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
          <Route path="/Admin/Users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/Admin/Payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
          <Route path="/Admin/Audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
          <Route path="/Admin/Announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />

          {/* anything unknown goes home sir */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
