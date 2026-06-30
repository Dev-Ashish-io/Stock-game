import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { FaBars, FaTimes } from "react-icons/fa";
import PropTypes from "prop-types"; 

const Navbar = ({ darkMode }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  Navbar.propTypes = {
    darkMode: PropTypes.bool.isRequired, // ✅ Add prop validation
  };
  

  return (
    <nav className="bg-gray-900 p-4 shadow-lg fixed w-full top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cyan-400">Stock Trading Game</h1>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex gap-6">
          <li>
            <Link 
              to="/" 
              className={`transition font-medium ${
                darkMode ? "text-white hover:text-cyan-400" : "text-gray-200 hover:text-blue-400"
              }`}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              to="/teams" 
              className={`transition font-medium ${
                darkMode ? "text-white hover:text-cyan-400" : "text-gray-200 hover:text-blue-400"
              }`}
            >
              Teams
            </Link>
          </li>
          <li>
            <Link 
              to="/stocks" 
              className={`transition font-medium ${
                darkMode ? "text-white hover:text-cyan-400" : "text-gray-200 hover:text-blue-400"
              }`}
            >
              Stocks
            </Link>
          </li>
          <li>
            <Link 
              to="/admin" 
              className={`transition font-medium ${
                darkMode ? "text-red-400 hover:text-red-500" : "text-red-500 hover:text-red-700"
              }`}
            >
              Admin
            </Link>
          </li>
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-cyan-400 focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FaTimes size={26} /> : <FaBars size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden absolute top-16 left-0 w-full bg-gray-900 border-t border-cyan-500"
        >
          <ul className="flex flex-col items-center gap-4 py-4 text-lg font-medium">
            <li>
              <Link
                to="/"
                className="text-white hover:text-cyan-400 transition-all duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/teams"
                className="text-white hover:text-cyan-400 transition-all duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Teams
              </Link>
            </li>
            <li>
              <Link
                to="/stocks"
                className="text-white hover:text-cyan-400 transition-all duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Stocks
              </Link>
            </li>
            <li>
              <Link
                to="/admin"
                className="text-red-400 hover:text-red-500 transition-all duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            </li>
          </ul>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
