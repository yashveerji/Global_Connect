// import React, { useContext, useState } from 'react'
// import logo from "../assets/GCF.jpg"
// import {useNavigate} from "react-router-dom"
// import { authDataContext } from '../context/AuthContext'
// import axios from "axios"
// import { userDataContext } from '../context/userContext'
// function Signup() {
//   let [show,setShow]=useState(false)
//   let {serverUrl}=useContext(authDataContext)
//   let {userData,setUserData}=useContext(userDataContext)
//   let navigate=useNavigate()
//   let [firstName,setFirstName]=useState("")
//   let [lastName,setLastName]=useState("")
//   let [userName,setUserName]=useState("")
//   let [email,setEmail]=useState("")
//   let [password,setPassword]=useState("")
//   let [loading,setLoading]=useState(false)
//   let [err,setErr]=useState("")

//   const handleSignUp=async (e)=>{
//     e.preventDefault()
//     setLoading(true)
//     try {
//       let result = await axios.post(serverUrl+"/api/auth/signup",{
// firstName,
// lastName,
// userName,
// email,
// password
//       },{withCredentials:true})
//       console.log(result)
//       setUserData(result.data)
//       navigate("/")
//       setErr("")
//       setLoading(false)
//       setFirstName("")
//       setLastName("")
//       setEmail("")
//       setPassword("")
//       setUserName("")
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
//    <form className='w-[90%] max-w-[400px] h-[600px] md:shadow-xl flex flex-col justify-center  gap-[10px] p-[15px]' onSubmit={handleSignUp}>
//     <h1 className='text-gray-800 text-[30px] font-semibold mb-[30px]'>Sign Up</h1>
//     <input type="text" placeholder='firstname' required className='w-[100%] h-[50px] border-2 border-gray-600 text-gray-800 text-[18px] px-[20px] py-[10px] rounded-md' value={firstName} onChange={(e)=>setFirstName(e.target.value)}/>
//     <input type="text" placeholder='lastname' required className='w-[100%] h-[50px] border-2 border-gray-600 text-gray-800 text-[18px] px-[20px] py-[10px] rounded-md' value={lastName} onChange={(e)=>setLastName(e.target.value)}/>
//     <input type="text" placeholder='userName' required className='w-[100%] h-[50px] border-2 border-gray-600 text-gray-800 text-[18px] px-[20px] py-[10px] rounded-md' value={userName} onChange={(e)=>setUserName(e.target.value)}/>
//     <input type="email" placeholder='email' required className='w-[100%] h-[50px] border-2 border-gray-600 text-gray-800 text-[18px] px-[20px] py-[10px] rounded-md' value={email} onChange={(e)=>setEmail(e.target.value)}/>
//     <div className='w-[100%] h-[50px] border-2 border-gray-600 text-gray-800 text-[18px]  rounded-md relative'>
//     <input type={show?"text":"password"} placeholder='password' required className='w-full h-fullborder-none text-gray-800 text-[18px] px-[20px] py-[10px] rounded-md' value={password} onChange={(e)=>setPassword(e.target.value)}/>
//     <span className='absolute right-[20px] top-[10px] text-[#24b2ff] cursor-pointer font-semibold' onClick={()=>setShow(prev=>!prev)}>{show?"hidden":"show"}</span>
//     </div>
//    {err && <p className='text-center text-red-500'>
//     *{err}
//     </p>}
//     <button className='w-[100%] h-[50px] rounded-full bg-[#24b2ff] mt-[40px] text-white' disabled={loading}>{loading?"Loading...":"Sign Up"}</button>
//     <p className='text-center cursor-pointer' onClick={()=>navigate("/login")}>Already have an account ? <span className='text-[#2a9bd8]' >Sign In</span></p>
//    </form>
//     </div>
//   )
// }

// export default Signup


import React, { useContext, useState } from 'react';
import logo from "../assets/GCF.jpg";
import { useNavigate } from "react-router-dom";
import { authDataContext } from '../context/AuthContext';
import axios from "axios";
import { userDataContext } from '../context/UserContext';

function Signup() {
  let [show, setShow] = useState(false);
  let { serverUrl } = useContext(authDataContext);
  let { setUserData } = useContext(userDataContext);
  let navigate = useNavigate();
  let [firstName, setFirstName] = useState("");
  let [lastName, setLastName] = useState("");
  let [userName, setUserName] = useState("");
  let [email, setEmail] = useState("");
  let [password, setPassword] = useState("");
  let [loading, setLoading] = useState(false);
  let [err, setErr] = useState("");
  // OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let result = await axios.post(
        serverUrl + "/api/auth/signup",
        { firstName, lastName, userName, email, password },
        { withCredentials: true }
      );
      // Expecting { message, userId }
      setPendingUserId(result.data.userId);
      setOtpStep(true);
      setErr("");
      setLoading(false);
    } catch (error) {
      setErr(error.response?.data?.message || "Something went wrong");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || !pendingUserId) return;
    setLoading(true);
    try {
      const res = await axios.post(
        serverUrl + "/api/auth/verify-otp",
        { userId: pendingUserId, otp },
        { withCredentials: true }
      );
      // Success: user is now logged in via httpOnly cookie
      setUserData(res.data);
      // Reset form state
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setUserName("");
      setOtp("");
      setPendingUserId("");
      setOtpStep(false);
      setErr("");
      navigate("/");
    } catch (error) {
      setErr(error.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingUserId) return;
    setLoading(true);
    setErr("");
    try {
      await axios.post(
        serverUrl + "/api/auth/resend-otp",
        { userId: pendingUserId },
        { withCredentials: true }
      );
    } catch (error) {
      setErr(error.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="w-full min-h-screen bg-gradient-to-br from-[#1A1F71] to-[#23243a] dark:from-[#121212] dark:to-[#121212] flex flex-col items-center justify-center gap-6 px-4 py-10 animate-fade-in">
      {/* Logo */}
      <div className="flex justify-center">
        <img src={logo} alt="Logo" className="h-[90px] object-contain rounded shadow" />
      </div>

      {/* Signup Form or OTP Form */}
      {!otpStep ? (
  <form className="card w-[90%] max-w-[420px] px-6 py-8 flex flex-col gap-4 animate-scale-in" onSubmit={handleSignUp}>
        <h1 className="text-3xl font-extrabold text-[#1A1F71] dark:text-yellow-300 mb-1 text-center">Create account</h1>
        <p className="text-center text-gray-700 dark:text-yellow-200/90 -mt-1 mb-2 text-sm">It’s quick and easy.</p>

        <input
          id="signup-first-name"
          name="firstName"
          autoComplete="given-name"
          type="text"
          placeholder="First Name"
          required
          className="input h-[50px]"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <input
          id="signup-last-name"
          name="lastName"
          autoComplete="family-name"
          type="text"
          placeholder="Last Name"
          required
          className="input h-[50px]"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

        <input
          id="signup-username"
          name="username"
          autoComplete="username"
          type="text"
          placeholder="Username"
          required
          className="input h-[50px]"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        <input
          id="signup-email"
          name="email"
          autoComplete="email"
          type="email"
          placeholder="Email"
          required
          className="input h-[50px]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="w-full h-[50px] relative transition-all">
          <label htmlFor="signup-password" className="sr-only">Password</label>
          <input
            id="signup-password"
            name="password"
            autoComplete="new-password"
            type={show ? "text" : "password"}
            placeholder="Password"
            required
            className="input h-[50px] pr-16"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#24b2ff] dark:text-blue-300 cursor-pointer font-medium text-sm select-none hover:underline"
            onClick={() => setShow((prev) => !prev)}
          >
            {show ? "Hide" : "Show"}
          </span>
        </div>

        {/* Error Message */}
        {err && (
          <p className="text-center text-red-500 text-sm font-medium -mt-1">*{err}</p>
        )}

          <button className="btn-primary h-[48px] mt-1" disabled={loading}>
            {loading ? "Sending OTP..." : "Sign Up"}
          </button>

          <p className="text-center text-gray-600 dark:text-yellow-200 mt-2">
            Already have an account?{" "}
            <button
              type="button"
              className="text-[#1A1F71] font-semibold hover:underline dark:text-yellow-300"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </p>
        </form>
      ) : (
  <form className="card w-[90%] max-w-[420px] px-6 py-8 flex flex-col gap-4 animate-scale-in" onSubmit={handleVerifyOtp}>
          <h1 className="text-2xl font-extrabold text-[#1A1F71] dark:text-yellow-300 mb-1 text-center">Verify OTP</h1>
          <p className="text-gray-700 dark:text-yellow-200/90 text-sm text-center mb-2">We sent a 6-digit code to {email}. Enter it below to finish signing up.</p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            className="input h-[50px] text-[18px] tracking-widest text-center"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          />

          {err && (
            <p className="text-center text-red-500 text-sm font-medium mt-1">*{err}</p>
          )}

      <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => { setOtpStep(false); setOtp(""); setErr(""); }}
        className="w-1/3 h-[44px] btn-secondary"
              disabled={loading}
            >
              Back
            </button>
            <button
        className="flex-1 h-[44px] btn-primary"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>

          <button type="button" onClick={handleResendOtp} className="mt-3 h-[44px] btn-secondary" disabled={loading}>Resend OTP</button>
        </form>
      )}
    </div>
  );
}

export default Signup;
