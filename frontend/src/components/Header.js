import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../store/userSlice";
import { Moon, Sun, Bell, UserCircle } from "lucide-react";

const Header = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const location = useLocation();

  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Theme setup
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowProfile(false);
  }, [location]);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const navLinks = [
    { to: "/", text: "Home" },
    { to: "/about", text: "About" },
    { to: "/services", text: "Services" },
    { to: "/contact", text: "Contact" },
    { to: "/feed", text: "Feed" },
    { to: "/jobs", text: "Jobs" },
    { to: "/connections", text: "Connections" },
    { to: "/messages", text: "Chat" },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition"
        >
          Global_Connect
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700 dark:text-gray-200">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`hover:text-indigo-600 transition ${
                location.pathname === link.to ? "text-indigo-600 font-semibold" : ""
              }`}
            >
              {link.text}
            </Link>
          ))}

          {/* Notification */}
          <button className="relative hover:text-indigo-600 transition" title="Notifications">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow">
              3
            </span>
          </button>

          {/* Profile Dropdown */}
          {user ? (
            <div className="relative">
              <button
                className="flex items-center gap-1 hover:text-indigo-600 transition"
                onClick={() => setShowProfile((prev) => !prev)}
                title="Profile"
              >
                <UserCircle size={22} />
              </button>
              {showProfile && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    👤 Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="hover:text-indigo-600 transition">Login</Link>
              <Link to="/signup" className="hover:text-indigo-600 transition">Signup</Link>
            </>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="ml-3 hover:text-indigo-600 transition"
            title="Toggle theme"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </nav>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-gray-700 dark:text-gray-200 text-xl"
          aria-label="Toggle navigation"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden px-4 py-4 space-y-3 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 animate-slide-down">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block hover:text-indigo-600 transition ${
                location.pathname === link.to ? "font-semibold text-indigo-600" : ""
              }`}
            >
              {link.text}
            </Link>
          ))}

          {user ? (
            <>
              <Link to="/profile" className="block hover:text-indigo-600 transition">👤 Profile</Link>
              <button onClick={handleLogout} className="text-red-500 hover:underline">🚪 Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block hover:text-indigo-600 transition">Login</Link>
              <Link to="/signup" className="block hover:text-indigo-600 transition">Signup</Link>
            </>
          )}

          {/* Mobile Theme Toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="mt-2 block hover:text-indigo-600 transition"
          >
            {dark ? "🌞 Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
