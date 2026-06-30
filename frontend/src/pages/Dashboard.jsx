import { useState, useEffect } from "react";
import { getRoundStatus, startRound, endRound, getTeams } from "../services/api"; // ✅ Import required APIs
import { getSocket, subscribeToEvent, unsubscribeFromEvent } from "../services/socket"; // ✅ Fixed Import
import TransactionHistory from "../components/TransactionHistory";
import UndoTransaction from "../components/UndoTransaction";
import { motion } from "framer-motion"; 



const Dashboard = () => {
  const [currentRound, setCurrentRound] = useState(0);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teams, setTeams] = useState([]);


  useEffect(() => {
    const fetchRoundStatus = async () => {
      const roundData = await getRoundStatus();
      setCurrentRound(roundData.round);
      setIsRoundActive(roundData.active);
    };
  
    const fetchTeams = async () => {
      try {
        const response = await getTeams();
    
        if (Array.isArray(response)) {
          setTeams(response);
        } else {
          console.error("⚠️ Unexpected Teams API Response:", response);
          setTeams([]);
        }
      } catch (error) {
        console.error("❌ Error fetching teams:", error);
        setTeams([]);
      }
    };
  
    fetchRoundStatus();
    fetchTeams();

    // ✅ Listen for real-time updates
  const updateHandler = (data) => {
    if (data.round) {
      setCurrentRound(data.round.number);
      setIsRoundActive(data.round.active);
    }
  };

  subscribeToEvent("update", updateHandler);

  return () => {
    unsubscribeFromEvent("update"); // ✅ Cleanup to prevent memory leaks
  };
}, []);

  // ✅ Start a new round
  const handleStartRound = async () => {
    await startRound();
    const roundData = await getRoundStatus();
    setCurrentRound(roundData.round);
    setIsRoundActive(roundData.active);
    setMessage("✅ New round started successfully!");
  };

  // ✅ End the current round
  const handleEndRound = async () => {
    await endRound();
    const roundData = await getRoundStatus();
    setCurrentRound(roundData.round);
    setIsRoundActive(roundData.active);
    setMessage("❌ Current round has ended!");
  };

  return (
    <div className="glass-container card p-8 mt-16">
      {/* ✅ Widened Dashboard Card for Fullscreen View */}
      <motion.div
        className="mb-6 p-6 bg-gray-900 rounded-lg shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="dashboard-title text-3xl font-bold  mb-4 text-left text-cyan-400">
          📊 Dashboard
        </h2>
        <p className=" text-lg text-left mb-4">
          Manage rounds and transactions in real-time.
        </p>

        {message && (
          <motion.div
            className="dashboard-message p-3 bg-gray-800 text-left text-lg font-semibold rounded-lg shadow-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {message}
          </motion.div>
        )}

        {/* ✅ Enlarged Current Round Box */}
        <motion.div
          className="dashboard-round bg-gray-900 p-6 rounded-lg mb-6 shadow-lg transition hover:shadow-xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-2xl font-semibold text-green-400 text-left">
            📅 Current Round: <span className="text-white">{currentRound}</span>
          </h3>
          <p
            className={`text-lg font-semibold text-left ${
              isRoundActive ? "text-green-500" : "text-red-500"
            }`}
          >
            {isRoundActive ? "🟢 Round is Active" : "🔴 Round is Ended"}
          </p>
        </motion.div>

        {/* ✅ Larger Buttons for Desktop */}
        <div className="dashboard-buttons flex justify-centre gap-6 mt-6">
          {!isRoundActive && (
            <motion.button
              className="btn btn-green text-lg px-6 py-3"
              onClick={handleStartRound}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🚀 Start New Round
            </motion.button>
          )}
          {isRoundActive && (
            <motion.button
              className="btn btn-light-blue text-lg px-6 py-3"
              onClick={handleEndRound}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ⛔ End Current Round
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ✅ Expanded Sections for Undo Transaction & Transaction History */}
      <motion.div
        className="extra-section max-w-5xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <UndoTransaction teamName={selectedTeam} />
        <TransactionHistory />
      </motion.div>
    </div>
  );
};

console.log("✅ Active WebSocket Connection ID:", getSocket().id);

export default Dashboard;
