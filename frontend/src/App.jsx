import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
import Stocks from "./pages/Stocks";
import AdminPanel from "./pages/AdminPanel";
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css"; // Ensure correct import


const App = () => {
  // ✅ Get dark mode preference from localStorage or default to dark mode
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  <Navbar darkMode={darkMode ?? false} />


  // ✅ Apply the theme class to <body>
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  return (
    <>
      {/* ✅ Navbar (Always Dark) */}
      <Navbar />

      {/* ✅ Light/Dark Mode Toggle (Fixed & Always Visible) */}
      <div className="fixed top-1 left-1 z-50">
        <button
          onClick={() => {
            setDarkMode((prev) => !prev);
            toast.info(darkMode ? "🌞 Light Mode Enabled" : "🌙 Dark Mode Enabled");
          }}
          className="btn1 btn-blue text-sm px-3 py-1 shadow-lg"
          style={{ fontSize: "14px", padding: "2px 12px", minWidth: "90px" }} // ✅ Smaller size
        >
          {darkMode ? "🌞 Light" : "🌙 Dark"}
        </button>
      </div>

      {/* ✅ Toast Notifications */}
      <ToastContainer position="top-right" autoClose={3000} />

      {/* ✅ Smooth Page Transitions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ✅ Background Color Changes, Navbar Stays Dark */}
        <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
          <div className="container mx-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/stocks" element={<Stocks />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default App;
