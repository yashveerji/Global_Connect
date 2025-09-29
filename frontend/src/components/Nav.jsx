
import React, { useContext, useEffect, useRef, useState } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa';
import logo2 from "../assets/GC.jpg"
import { IoSearchSharp } from "react-icons/io5";
import { TiHome } from "react-icons/ti";
import { FaUserGroup } from "react-icons/fa6";
import { IoNotificationsSharp } from "react-icons/io5";
import dp from "../assets/dp.webp"
import { userDataContext } from '../context/UserContext';
import { authDataContext } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import { MdWork } from "react-icons/md";
import { BsBookmarkHeartFill } from 'react-icons/bs';
import { HiOutlineUser } from 'react-icons/hi';
import { IoLogOutOutline } from 'react-icons/io5';
import { FaGithub } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { bust } from '../utils/image';

function Nav() {
    // Spring config for snappy, subtle interactions
    const spring = { type: 'spring', stiffness: 500, damping: 28, mass: 0.8 };
    // Reusable glow wrapper for icons
    const GlowIcon = ({ children, active = false }) => (
        <motion.span
            className="relative inline-flex"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95, y: 0 }}
            transition={spring}
        >
            <motion.span
                className="absolute -inset-3 -z-10 rounded-full blur-md"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: active ? 0.25 : 0 }}
                whileHover={{ opacity: 0.6, scale: 1 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                    background:
                        'radial-gradient(72% 72% at 50% 40%, rgba(99,102,241,0.55), rgba(168,85,247,0.35) 55%, rgba(236,72,153,0.22) 75%, transparent)',
                }}
            />
            <span className="relative">{children}</span>
        </motion.span>
    );
    const [activeSearch, setActiveSearch] = useState(false)
    const { userData, setUserData, handleGetProfile, unreadCount, chatUnreadCount } = useContext(userDataContext)
    const [showPopup, setShowPopup] = useState(false)
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const navigate = useNavigate()
    const location = useLocation()
    const { serverUrl } = useContext(authDataContext)
    const [searchInput, setSearchInput] = useState("")
    const [searchData, setSearchData] = useState([])
    const [activeIndex, setActiveIndex] = useState(-1)
    const searchTimerRef = useRef(null)
    const searchBoxRef = useRef(null)
    const searchInputRef = useRef(null)
    const lastRequestId = useRef(0)
    const popupRef = useRef(null)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10)
        onScroll()
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
        // Remove manual body background override so Tailwind dark: classes work
        document.body.style.background = '';
    }, [darkMode]);

    // Close profile popup on outside click or ESC
    useEffect(() => {
        if (!showPopup) return;
        const onDocClick = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                setShowPopup(false);
            }
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setShowPopup(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [showPopup]);

    const handleSignOut = async () => {
        try {
            await axios.get(serverUrl + "/api/auth/logout", { withCredentials: true })
            setUserData(null)
            navigate("/login")
        } catch (error) {
            console.log(error);
        }
    }

    const runSearch = async (q, requestId) => {
        if (!q || q.trim().length === 0) { setSearchData([]); return; }
        try {
            const res = await axios.get(`${serverUrl}/api/user/search`, { params: { query: q }, withCredentials: true });
            // Drop stale results
            if (requestId !== lastRequestId.current) return;
            setSearchData(Array.isArray(res.data) ? res.data : []);
            setActiveIndex(res.data?.length ? 0 : -1);
        } catch {
            if (requestId !== lastRequestId.current) return;
            setSearchData([]);
        }
    }

    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (!searchInput) {
            setSearchData([]); setActiveIndex(-1); return;
        }
        const id = ++lastRequestId.current;
        searchTimerRef.current = setTimeout(() => runSearch(searchInput, id), 350);
        return () => clearTimeout(searchTimerRef.current);
    }, [searchInput])

    // Close search results on outside click/ESC
    useEffect(() => {
        if (!searchData.length) return;
        const onDocClick = (e) => {
            if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
                setSearchData([]);
                setActiveIndex(-1);
            }
        };
        const onKey = (e) => { if (e.key === 'Escape') { setSearchData([]); setActiveIndex(-1); } };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [searchData.length])

    const onSearchKeyDown = (e) => {
        const k = e.key;
        if (!searchData.length) return;
        if (k === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % searchData.length);
        } else if (k === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + searchData.length) % searchData.length);
        } else if (k === 'Enter') {
            e.preventDefault();
            const sel = searchData[activeIndex] || searchData[0];
            if (sel) {
                setSearchData([]);
                setActiveIndex(-1);
                handleGetProfile(sel.userName);
            }
        }
    }

    const isActive = (path) => location.pathname === path

    return (
        <>
            <header className={`w-full h-[80px] bg-gradient-to-br from-white/80 to-[#F3F4F6] dark:from-[#23272F] dark:to-[#23272F] backdrop-blur-md flex items-center px-4 lg:px-12 z-[100] transition-colors duration-300 border-b border-gray-200 dark:border-[#2C2F36] ${scrolled ? 'shadow-lg' : 'shadow'} fixed top-0 left-0`}
                aria-label="Main Navigation"
            >
                {/* Left: Logo & Search */}
                <div className='flex items-center gap-4 flex-1 rounded-md'>
                    <img
                        src={logo2}
                        alt="Logo"
                        className='w-[50px] cursor-pointer rounded-lg shadow-md border-2 border-indigo-400 dark:border-gray-700 bg-white/60 dark:bg-gray-800 transition-all duration-300'
                        onClick={() => {
                            setActiveSearch(false)
                            navigate("/")
                        }}
                        aria-label="Go to Home"
                    />
                    {!activeSearch && (
                        <IoSearchSharp
                            className='w-[23px] h-[23px] text-gray-500 dark:text-gray-300 lg:hidden cursor-pointer hover:scale-110 transition-transform'
                            onClick={() => setActiveSearch(true)}
                            aria-label="Open search"
                        />
                    )}
                    <form
                        className={`bg-[#f0efe7] dark:bg-gray-800 h-[40px] rounded-full flex items-center gap-2 px-3 transition-all duration-300 ${activeSearch ? "flex" : "hidden"} lg:flex w-[200px] lg:w-[350px] shadow-inner`}
                        aria-label="Search users"
                        ref={searchBoxRef}
                    >
                        <IoSearchSharp className='w-[20px] h-[20px] text-gray-600 dark:text-gray-300' />
                        <input
                            type="text"
                            placeholder='Search users...'
                            className='w-full bg-transparent outline-none text-gray-800 dark:text-gray-100'
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={onSearchKeyDown}
                            ref={searchInputRef}
                            role="combobox"
                            aria-expanded={searchData.length > 0}
                            aria-controls="search-listbox"
                            aria-activedescendant={activeIndex >= 0 && searchData[activeIndex]?._id ? `search-opt-${searchData[activeIndex]._id}` : undefined}
                            aria-label="Search input"
                        />
                    </form>
                </div>

                {/* Center attribution */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="hidden md:flex flex-none items-center justify-center px-3"
                >
                    <div className="group inline-flex items-center gap-2 rounded-full border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur px-3 py-1.5 shadow-sm transition-all hover:shadow-md">
                        {/* Main area -> Portfolio */}
                        <a
                            href="https://yashveerji-portfolio.onrender.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open Yashveer Singh's portfolio website"
                            className="inline-flex items-center gap-2 pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 rounded"
                        >
                            <img
                                src="https://github.com/yashveerji.png"
                                alt="Yashveer Singh's Avatar"
                                className="h-5 w-5 rounded-full ring-1 ring-black/5 dark:ring-white/10"
                                loading="lazy"
                            />
                            <span className="text-[12px] leading-none text-gray-700 dark:text-gray-200">Designed & Coded by</span>
                            <span className="text-[12px] font-semibold leading-none bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent group-hover:from-indigo-500 group-hover:to-pink-500">
                                Yashveer Singh
                            </span>
                        </a>
                        {/* GitHub icon link */}
                        <a
                            href="https://github.com/yashveerji"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open Yashveer Singh's GitHub profile"
                            className="p-1 rounded-full hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                            title="GitHub"
                        >
                            <FaGithub className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                        </a>
                    </div>
                </motion.div>

                {/* Search Results */}
                {searchData.length > 0 && (
                    <div
                        id="search-listbox"
                        role="listbox"
                        className="fixed top-[75px] left-0 lg:left-12 shadow-lg w-full lg:w-[500px] bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#2C2F36] overflow-auto max-h-[260px] z-[1200] animate-fadeIn"
                    >
                        {searchData.map((sea, idx) => (
                            <div
                                id={`search-opt-${sea._id}`}
                                role="option"
                                aria-selected={idx === activeIndex}
                                key={sea._id}
                                className={`flex gap-3 items-center border-b border-gray-100 dark:border-[#2C2F36] px-3 py-2 cursor-pointer transition ${idx === activeIndex ? 'bg-gray-100 dark:bg-[#161616]' : 'hover:bg-gray-50 dark:hover:bg-[#161616]'}`}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onClick={() => { setSearchData([]); setActiveIndex(-1); handleGetProfile(sea.userName); }}
                                aria-label={`Go to profile of ${sea.firstName} ${sea.lastName}`}
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-green-400 shadow-md">
                                    <img src={(sea.profileImage ? bust(sea.profileImage) : null) || dp} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                        {`${sea.firstName} ${sea.lastName}`}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-300 truncate max-w-[260px]">
                                        {sea.headline}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Right: Nav Items */}
                <nav className='flex items-center gap-4' aria-label="Main navigation links">
                    <button
                        className={`group hidden lg:flex flex-col items-center cursor-pointer rounded-full px-4 py-2 font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isActive("/") ? "bg-indigo-500 text-white shadow-lg" : "text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`}
                        onClick={() => navigate("/")}
                        aria-label="Home"
                    >
                        <GlowIcon active={isActive("/")}>
                            <TiHome className='w-[23px] h-[23px] mb-1 transition-transform duration-200' />
                        </GlowIcon>
                        <span>Home</span>
                    </button>
                    <button
                        className={`group hidden md:flex flex-col items-center cursor-pointer rounded-full px-4 py-2 font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isActive("/network") ? "bg-indigo-500 text-white shadow-lg" : "text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`}
                        onClick={() => navigate("/network")}
                        aria-label="My Network"
                    >
                        <GlowIcon active={isActive("/network")}>
                            <FaUserGroup className='w-[23px] h-[23px] mb-1 transition-transform duration-200' />
                        </GlowIcon>
                        <span>My Network</span>
                    </button>
                    <button
                        className={`group flex flex-col items-center cursor-pointer rounded-full px-4 py-2 font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isActive("/chat") ? "bg-indigo-500 text-white shadow-lg" : "text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`}
                        onClick={() => navigate("/chat")}
                        aria-label="Chat"
                    >
                        <GlowIcon active={isActive("/chat")}>
                                                        <span className="relative">
                                                            <IoChatbubbleEllipsesSharp className='w-[23px] h-[23px] mb-1 transition-transform duration-200' />
                                                            {chatUnreadCount > 0 && (
                                                                <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center shadow">
                                                                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                                                                </span>
                                                            )}
                                                        </span>
                        </GlowIcon>
                        <span className='hidden md:block'>Chat</span>
                    </button>
                    <button
                        className={`group flex flex-col items-center cursor-pointer rounded-full px-4 py-2 font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isActive("/jobs") ? "bg-indigo-500 text-white shadow-lg" : "text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`}
                        onClick={() => navigate("/jobs")}
                        aria-label="Jobs"
                    >
                        <GlowIcon active={isActive("/jobs")}>
                            <MdWork className="w-[23px] h-[23px] mb-1 transition-transform duration-200" />
                        </GlowIcon>
                        <span className="hidden md:block">Jobs</span>
                    </button>
                    <button
                        className={`group flex flex-col items-center cursor-pointer rounded-full px-4 py-2 font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isActive("/notification") ? "bg-indigo-500 text-white shadow-lg" : "text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`}
                        onClick={() => navigate("/notification")}
                        aria-label="Notifications"
                    >
                        <GlowIcon active={isActive("/notification")}>
                            <span className="relative">
                                <IoNotificationsSharp className='w-[23px] h-[23px] mb-1 transition-transform duration-200' />
                                {unreadCount > 0 && (
                                  <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center shadow">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </span>
                                )}
                            </span>
                        </GlowIcon>
                        <span className='hidden md:block'>Notifications</span>
                    </button>
                    <button
                        className={`group flex flex-col items-center cursor-pointer rounded-full px-4 py-2 font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isActive("/saved") ? "bg-indigo-500 text-white shadow-lg" : "text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`}
                        onClick={() => navigate('/saved')}
                        aria-label="Saved"
                    >
                        <GlowIcon active={isActive("/saved")}>
                            <BsBookmarkHeartFill className='w-[23px] h-[23px] mb-1 transition-transform duration-200' />
                        </GlowIcon>
                        <span className='hidden md:block'>Saved</span>
                    </button>
                    {/* Dark/Light Mode Toggle */}
                    <button
                        className={`ml-2 p-2 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all duration-300
                            ${darkMode
                                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 scale-110'
                                : 'bg-gradient-to-br from-indigo-200 to-yellow-100 border-2 border-indigo-400 scale-110'
                            }
                        `}
                        onClick={() => setDarkMode((prev) => !prev)}
                        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        <span className={`block transition-transform duration-300 ${darkMode ? 'rotate-0' : '-rotate-90'}`}>
                            {darkMode ? <FaSun className='text-yellow-400' /> : <FaMoon className='text-indigo-700' />}
                        </span>
                    </button>
                    {/* Profile Picture with status */}
                    <div
                        className='w-[44px] h-[44px] rounded-full overflow-hidden cursor-pointer border-2 border-indigo-400 dark:border-yellow-400 shadow-md hover:scale-105 hover:shadow-lg transition-all relative ml-2'
                        onClick={() => setShowPopup(prev => !prev)}
                        tabIndex={0}
                        aria-label="Open profile menu"
                        aria-expanded={showPopup}
                    >
                        <img src={(userData?.profileImage ? bust(userData.profileImage) : null) || dp} alt="Profile" className='w-full h-full object-cover' />
                        {/* Status indicator */}
                        <span className='absolute bottom-1 right-1 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white dark:ring-[#23272F] animate-pulse'></span>
                    </div>
                </nav>
            </header>
            {/* Overlay for popup */}
            {showPopup && (
                <div
                    className='fixed inset-0 z-[1000] bg-black/20 dark:bg-black/40 backdrop-blur-[2px] animate-fade-in'
                    onClick={() => setShowPopup(false)}
                    aria-hidden='true'
                />
            )}
            {/* Profile Popup outside header for visibility */}
            {showPopup && (
                <div
                    ref={popupRef}
                    className='fixed top-[90px] right-4 lg:right-12 w-[320px] bg-white dark:bg-[#1E1E1E] shadow-2xl rounded-xl p-4 z-[1100] border border-gray-200 dark:border-[#2C2F36] origin-top-right animate-scale-in'
                    role="menu"
                    aria-label="Profile menu"
                >
                    <div className='flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-[#2C2F36]'>
                        <div className='w-12 h-12 rounded-full overflow-hidden ring-2 ring-indigo-400 dark:ring-yellow-400 shadow'>
                            <img src={(userData?.profileImage ? bust(userData.profileImage) : null) || dp} alt="Profile" className='w-full h-full object-cover' />
                        </div>
                        <div className='flex-1 min-w-0'>
                            <div className='text-sm font-semibold text-gray-900 dark:text-white truncate'>{`${userData.firstName} ${userData.lastName}`}</div>
                            {userData?.userName && (
                                <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>@{userData.userName}</div>
                            )}
                        </div>
                    </div>

                    <ul className='py-2'>
                        <li>
                            <button
                                className='w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors'
                                onClick={() => handleGetProfile(userData.userName)}
                                aria-label='View Profile'
                                role='menuitem'
                            >
                                <HiOutlineUser className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
                                <span>View Profile</span>
                            </button>
                        </li>
                        <li>
                            <button
                                className='w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-[#2A1414] focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors'
                                onClick={handleSignOut}
                                aria-label='Sign Out'
                                role='menuitem'
                            >
                                <IoLogOutOutline className='w-5 h-5' />
                                <span>Sign Out</span>
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </>
    );
}

export default Nav;
