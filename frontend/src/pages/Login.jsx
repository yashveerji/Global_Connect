// import React, { useContext, useState } from 'react'
// import logo from "../assets/GCF.jpg"
// import {useNavigate} from "react-router-dom"
// import { authDataContext } from '../context/AuthContext'
// import axios from "axios"
// import { userDataContext } from '../context/userContext'
// function Login() {
//   let [show,setShow]=useState(false)
//   let {serverUrl}=useContext(authDataContext)
//   let {userData,setUserData}=useContext(userDataContext)
//   let navigate=useNavigate()
//   let [email,setEmail]=useState("")
//   let [password,setPassword]=useState("")
//   let [loading,setLoading]=useState(false)
//   let [err,setErr]=useState("")

//   const handleSignIn=async (e)=>{
//     e.preventDefault()
//     setLoading(true)
//     try {
//       let result = await axios.post(serverUrl+"/api/auth/login",{
// email,
// password
//       },{withCredentials:true})
//       setUserData(result.data)
//       navigate("/")
//       setErr("")
//       setLoading(false)
//       setEmail("")
//       setPassword("")
//     } catch (error) {
//       setErr(error.response.data.message)
//       setLoading(false)
//     }
//   }
//   return (
//     <div className='w-full h-screen bg-[white] flex flex-col items-center justify-start gap-[10px]'>
//    <div className='p-[30px] lg:p-[35px] w-full h-[80px] flex items-center' >
//     <img src={logo} alt="" />
//    </div>
//    <form className='w-[90%] max-w-[400px] h-[600px] md:shadow-xl flex flex-col justify-center  gap-[10px] p-[15px]' onSubmit={handleSignIn}>
//     <h1 className='text-gray-800 text-[30px] font-semibold mb-[30px]'>Sign In</h1>
   
//     <input type="email" placeholder='email' required className='w-[100%] h-[50px] border-2 border-gray-600 text-gray-800 text-[18px] px-[20px] py-[10px] rounded-md' value={email} onChange={(e)=>setEmail(e.target.value)}/>
//     <div className='w-[100%] h-[50px] border-2 border-gray-600 text-gray-800 text-[18px]  rounded-md relative'>
//     <input type={show?"text":"password"} placeholder='password' required className='w-full h-fullborder-none text-gray-800 text-[18px] px-[20px] py-[10px] rounded-md' value={password} onChange={(e)=>setPassword(e.target.value)}/>
//     <span className='absolute right-[20px] top-[10px] text-[#24b2ff] cursor-pointer font-semibold' onClick={()=>setShow(prev=>!prev)}>{show?"hidden":"show"}</span>
//     </div>
//    {err && <p className='text-center text-red-500'>
//     *{err}
//     </p>}
//     <button className='w-[100%] h-[50px] rounded-full bg-[#24b2ff] mt-[40px] text-white' disabled={loading}>{loading?"Loading...":"Sign In"}</button>
//     <p className='text-center cursor-pointer' onClick={()=>navigate("/signup")}>want to create a new account ? <span className='text-[#2a9bd8]' >Sign Up</span></p>
//    </form>
//     </div>
//   )
// }

// export default Login

import React, { useContext, useEffect, useState } from 'react';
import logo from "../assets/GCF.jpg";
import { useNavigate } from "react-router-dom";
import { authDataContext } from '../context/AuthContext';
import axios from "axios";
import { userDataContext } from '../context/UserContext';

function Login() {
  let [show, setShow] = useState(false);
  let { serverUrl } = useContext(authDataContext);
  let { setUserData } = useContext(userDataContext);
  let navigate = useNavigate();
  let [email, setEmail] = useState("");
  let [password, setPassword] = useState("");
  let [loading, setLoading] = useState(false);
  let [err, setErr] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let result = await axios.post(
        serverUrl + "/api/auth/login",
        { email, password },
        { withCredentials: true }
      );
      setUserData(result.data);
      navigate("/");
      setErr("");
      setLoading(false);
      setEmail("");
      setPassword("");
    } catch (error) {
      setErr(error.response?.data?.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
  <div className="w-full min-h-screen bg-gradient-to-br from-[#1A1F71] to-[#23243a] dark:from-[#121212] dark:to-[#121212] flex items-center justify-center px-4 py-10 text-white animate-fade-in">
      <div className="w-full max-w-5xl card p-0 overflow-hidden grid grid-cols-1 md:grid-cols-2 relative animate-scale-in">
        <button
          type="button"
          className="absolute right-4 top-4 z-10 text-xs px-3 py-1 rounded-full border border-yellow-400 text-yellow-300 bg-[#23243a]/60 backdrop-blur hover:bg-[#23243a]/80"
          onClick={() => setDarkMode((p)=>!p)}
        >
          {darkMode ? 'Light mode' : 'Dark mode'}
        </button>
        {/* Brand panel (left) */}
        <div className="relative hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-[#1A1F71] to-[#2f3052] text-yellow-200 p-10">
          <img src={logo} alt="Global Connect" className="h-24 w-24 rounded-xl object-cover shadow-lg mb-5" />
          <h2 className="text-2xl font-bold text-yellow-300 mb-2 text-center">Welcome to Global Connect</h2>
          <p className="text-sm text-yellow-200/90 text-center max-w-sm">
            Connect with professionals, chat in real time, discover jobs, and grow your network.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-2 text-sm text-yellow-100/90">
            <div className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-yellow-300"/> Instant chat and calls</div>
            <div className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-yellow-300"/> Smart AI assistant</div>
            <div className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-yellow-300"/> Job search & applications</div>
          </div>
        </div>

        {/* Form panel (right) */}
  <div className="bg-white text-gray-800 dark:bg-[#1E1E1E] dark:text-white p-8 md:p-10">
          <div className="md:hidden flex items-center justify-center mb-6">
            <img src={logo} alt="Global Connect" className="h-16 w-16 rounded-lg object-cover shadow" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#1A1F71] dark:text-yellow-300 text-center">Sign in</h1>
          <p className="text-center text-gray-600 dark:text-yellow-200/80 mt-1 mb-6 text-sm">Welcome back! Please enter your details.</p>

          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            {/* Email */}
            <label htmlFor="login-email" className="sr-only">Email</label>
            <input
              id="login-email"
              name="email"
              autoComplete="email"
              type="email"
              placeholder="Email"
              required
              className="input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Password */}
            <div className="relative">
              <label htmlFor="login-password" className="sr-only">Password</label>
              <input
                id="login-password"
                name="password"
                autoComplete="current-password"
                type={show ? "text" : "password"}
                placeholder="Password"
                required
                className="input pr-20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1F71] dark:text-yellow-300 text-sm font-semibold hover:underline"
                onClick={() => setShow((prev) => !prev)}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>

            {/* Error */}
            {err && (
              <p className="text-center text-red-500 text-sm font-medium -mt-1">*{err}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-gray-700 dark:text-yellow-200/90">
                <input type="checkbox" className="accent-[#1A1F71] dark:accent-yellow-400" />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[#1A1F71] hover:underline dark:text-yellow-300"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              className="btn-primary h-[48px] mt-2"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Sign Up */}
            <p className="text-center text-gray-600 dark:text-yellow-200/80 mt-2 text-sm">
              Don’t have an account?{' '}
              <button
                type="button"
                className="text-[#1A1F71] font-semibold hover:underline dark:text-yellow-300"
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
