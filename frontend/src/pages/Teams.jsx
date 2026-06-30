import { useState, useEffect } from "react";
import { getTeams, getStocks } from "../services/api";
import TeamList from "../components/TeamList";
import TeamTrade from "../components/TeamTrade";
import StockTransaction from "../components/StockTransaction"; // ✅ Buy/Sell Component
import { motion } from "framer-motion";
import { subscribeToEvent, unsubscribeFromEvent } from "../services/socket";

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeams = async () => {
      const data = await getTeams();
      setTeams(data);
    };
    fetchTeams();

    // ✅ Listen for WebSocket event when a new team is added
    subscribeToEvent("teamUpdated", (newTeam) => {
      setTeams((prevTeams) => [...prevTeams, newTeam]);
    });

    return () => unsubscribeFromEvent("teamUpdated"); // Cleanup
  }, []);


  // ✅ Fetch Teams and Stocks on Load
  useEffect(() => {
    const fetchTeamsAndStocks = async () => {
      try {
        const teamsData = await getTeams();
        const stocksData = await getStocks();

        // ✅ Ensure the data is formatted correctly
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setStocks(Array.isArray(stocksData) ? stocksData : []);
      } catch (error) {
        console.error("⚠️ Error fetching teams or stocks:", error);
        setError("❌ Failed to load teams and stocks.");
      } finally {
        setLoading(false);
      }
    };
    fetchTeamsAndStocks();
  }, []);

  return (
    <><div>
      {/* Render stocks here */}
    </div><motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-8 bg-gray-900 min-h-screen text-white"
    >
        <h2 className="text-4xl font-bold text-cyan-400 mb-6 text-center">
          🏆 Manage Teams
        </h2>

        {loading ? (
          <p className="text-center text-gray-400">Loading teams & stocks...</p>
        ) : error ? (
          <p className="text-center text-red-400">{error}</p>
        ) : (
          <>
            {/* 🔄 Trade Stocks Between Teams */}
            <div className="mb-8 p-6 bg-gray-800 rounded-lg shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-green-400">
                🔄 Trade Stocks Between Teams
              </h3>
              <TeamTrade teams={teams} />
            </div>

            {/* 📈 Buy/Sell Stocks Section */}
            <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-yellow-400">
                📈 Buy/Sell Stocks
              </h3>
              {teams.length > 0 && stocks.length > 0 ? (
                <StockTransaction teams={teams} stocks={stocks} />
              ) : (
                <p className="text-gray-400">
                  ⚠️ No available teams or stocks for transactions.
                </p>
              )}
            </div>

            {/* 📋 Team Overview */}
            <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-blue-400">
                📋 Team Overview
              </h3>
              {teams.length > 0 ? (
                <TeamList teams={teams} />
              ) : (
                <p className="text-gray-400">⚠️ No teams available.</p>
              )}
            </div>
          </>
        )}
      </motion.div></>
  );
};

export default Teams;
