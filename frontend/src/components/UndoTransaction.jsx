import { useState, useEffect } from "react";
import { undoLastTransaction, getTransactions, getTeams } from "../services/api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";
import { subscribeToEvent, unsubscribeFromEvent } from "../services/socket"; // ✅ Import WebSocket functions

const UndoTransaction = () => {
  const [loading, setLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [showSelect, setShowSelect] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teams, setTeams] = useState([]); // ✅ Default to an empty array

  /*** ✅ Fetch Teams on Component Mount ***/
   /*** ✅ Fetch Teams for Dropdown on Mount ***/
   useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsData = await getTeams();
        if (Array.isArray(teamsData) && teamsData.length > 0) {
          setTeams(teamsData);
        } else {
          console.error("⚠️ No teams found.");
          setTeams([]);
        }
      } catch (error) {
        console.error("❌ Error fetching teams:", error);
        toast.error("⚠️ Failed to load teams!");
        setTeams([]);
      }
    };
    fetchTeams();
  }, []);

  /*** ✅ Fetch Last Transaction for Selected Team ***/
  useEffect(() => {
    if (selectedTeam) {
      fetchLastTransaction();
    }
  }, [selectedTeam]);

  const fetchLastTransaction = async () => {
    try {
        const response = await fetch(`/api/transactions/last/${selectedTeam}`);
        const data = await response.json();

        if (data.success && data.data) {
            setLastTransaction(data.data);
        } else {
            console.error("⚠️ No last transaction found:", data);
            setLastTransaction(null);
        }
    } catch (error) {
        console.error("⚠️ Error fetching last transaction:", error);
        toast.error("⚠️ Unable to fetch last transaction.");
        setLastTransaction(null);
    }
};


  /*** ✅ Handle Undo Transaction ***/
  const handleUndoTransaction = async () => {
    if (!selectedTeam) {
      toast.warn("⚠️ Please select a team!");
      return;
    }

    if (!lastTransaction) {
      toast.warn("⚠️ No recent transactions to undo.");
      return;
    }

    setLoading(true);
    try {
      const response = await undoLastTransaction(selectedTeam);
      if (response.success) {
          toast.success("✅ Transaction undone successfully!");

          // ✅ Fetch latest transactions and update UI
          const updatedTransactions = await getTransactions();
          setTransactions(updatedTransactions.data);

          // ✅ Fetch updated team funds
          const updatedTeams = await getTeams();
          setTeams(updatedTeams);
      } else {
          toast.error("⚠️ Failed to undo transaction.");
      }
  } catch (error) {
      console.error("❌ Error undoing transaction:", error);
      toast.error("⚠️ Unable to undo transaction.");
  } finally {
      setLoading(false);
  }
};

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 bg-gray-900 border rounded-lg shadow-lg"
    >
      <h3 className="text-2xl font-semibold text-red-400 mb-4">⏪ Undo Last Transaction</h3>
  
      {/* Select Team Dropdown */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-1">🔍 Select Team:</label>
        <select
          className="w-full p-2 bg-gray-800 text-white rounded focus:ring focus:ring-red-500"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          <option value="">Choose Team</option>
          {teams.length > 0 ? (
            teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))
          ) : (
            <option disabled>⚠️ No Teams Available</option>
          )}
        </select>
      </div>
  
      {/* Last Transaction Details */}
      {lastTransaction ? (
        <div className="bg-gray-800 p-3 rounded-lg text-gray-300 shadow-md">
          <p><strong>📊 Stock:</strong> {lastTransaction.stock_name}</p>
          <p><strong>🔢 Quantity:</strong> {lastTransaction.quantity}</p>
          <p><strong>💰 Price:</strong> ${lastTransaction.price}</p>
          <p><strong>🕒 Date:</strong> {new Date(lastTransaction.created_at).toLocaleString()}</p>
        </div>
      ) : (
        <p className="text-gray-400 text-center mt-2">⚠️ No recent transactions found.</p>
      )}
  
      {/* Undo Transaction Button */}
      <button
        className={`btn btn-red ${
          loading ? "bg-gray-600 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"
        }`}
        onClick={() => {
          if (!showSelect) setShowSelect(true);
          else handleUndoTransaction();
        }}
        disabled={loading}
      >
        {loading ? "⏳ Undoing..." : showSelect ? "↩️ Confirm Undo" : "↩️ Undo Last Transaction"}
      </button>
    </motion.div>
  );
};

export default UndoTransaction;
