import React, { Suspense, useContext } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
const Home = React.lazy(()=>import('./pages/Home'))
const Signup = React.lazy(()=>import('./pages/Signup'))
const Login = React.lazy(()=>import('./pages/Login'))
const ForgotPassword = React.lazy(()=>import('./pages/ForgotPassword'))
import { userDataContext } from './context/UserContext'
const Network = React.lazy(()=>import('./pages/Network'))
const Profile = React.lazy(()=>import('./pages/Profile'))
const Notification = React.lazy(()=>import('./pages/Notification'))
const JobBoard = React.lazy(()=>import('./pages/JobBoard'))
const JobForm = React.lazy(()=>import('./pages/JobForm'))
import Nav from './components/Nav'
const ChatPage = React.lazy(()=>import('./pages/ChatPage'))
import Saved from './pages/Saved'
import CommandPalette from './components/CommandPalette'
import ScrollTop from './components/ui/ScrollTop'

function App() {
  let {userData}=useContext(userDataContext)
  const location = useLocation()
  return (
  <>
  <CommandPalette />
  <Suspense fallback={<div className="w-full min-h-screen flex items-center justify-center text-gray-600">Loading…</div>}>
  <AnimatePresence mode="wait">
  <Routes location={location}>
    <Route path='/' element={userData?<><Nav/><Home/></> :<Navigate to="/login"/>}/>
    <Route path='/signup' element={userData?<Navigate to="/"/>:<Signup/>}/>
  <Route path='/login' element={userData?<Navigate to="/"/>:<Login/>}/>
  <Route path='/forgot-password' element={<ForgotPassword/>} />
    <Route path='/network' element={userData?<Network/>:<Navigate to="/login"/>}/>
  <Route path='/profile' element={userData?<Profile/>:<Navigate to="/login"/>}/>
  <Route path='/profile/:userName' element={userData?<Profile/>:<Navigate to="/login"/>}/>
    <Route path='/notification' element={userData?<Notification/>:<Navigate to="/login"/>}/>
    <Route path='/chat' element={<ChatPage/>}/>
  <Route path='/saved' element={userData?<><Nav/><Saved/></>:<Navigate to="/login"/>}/>
     <Route path="/jobs" element={<JobBoard />} />
    <Route path='/jobs/new' element={<JobForm/>}/>
  
  </Routes>
  </AnimatePresence>
  </Suspense>
  <ScrollTop />
  </>
  )
}

export default App
