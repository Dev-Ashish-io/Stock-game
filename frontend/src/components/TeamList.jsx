import { useEffect, useState } from "react";
import { getTeams } from "../services/api"; // ✅ Import API function
import { motion } from "framer-motion"; // ✅ For animations
import { FaUsers } from "react-icons/fa"; // ✅ Icon for teams
import { toast } from "react-toastify"; // ✅ Notifications
import { subscribeToEvent, unsubscribeFromEvent } from "../services/socket"; // ✅ Import WebSocket functions

const TeamList = () => {
  const [teams, setTeams] = useState([]); // ✅ Always start as an array
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await getTeams();
        console.log("✅ API Response:", response);
  
        if (Array.isArray(response)) {
          setTeams(response); // ✅ Directly set if response is an array
        } else if (response?.data && Array.isArray(response.data)) {
          setTeams(response.data); // ✅ Handle cases where response contains `.data`
        } else {
          console.error("⚠️ Unexpected Teams API Response:", response);
          toast.error("⚠️ Failed to load teams.");
          setTeams([]); // ✅ Prevents crash by setting fallback empty array
        }
      } catch (error) {
        console.error("❌ Error fetching teams:", error);
        toast.error("❌ Unable to fetch teams.");
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
  
    fetchTeams();


  // ✅ Listen for real-time team updates
  const teamUpdateHandler = (updatedTeamList) => {
    setTeams(updatedTeamList);
};

subscribeToEvent("teamStatusChanged", teamUpdateHandler);

return () => {
    unsubscribeFromEvent("teamStatusChanged"); // ✅ Prevents duplicate listeners
};
}, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 bg-gray-900 border border-gray-700 rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center gap-2">
        <FaUsers className="text-green-400" /> Team Standings
      </h2>

      {loading ? (
        <p className="text-center text-gray-400">Loading teams...</p>
      ) : teams.length === 0 ? (
        <p className="text-center text-gray-500">No teams available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border border-gray-700 rounded-lg">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="p-3 border border-gray-600">Team Name</th>
                <th className="p-3 border border-gray-600">Funds</th>
                <th className="p-3 border border-gray-600">Stocks</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr
                  key={team.id || team.name}
                  className={`text-center transition duration-200 ${
                    index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"
                  } hover:bg-gray-600`}
                >
                  <td className="p-3 border border-gray-600 font-semibold text-white">
                    {team.name || "Unknown Team"}
                  </td>
                  <td className="p-3 border border-gray-600 text-green-400 font-semibold">
                    ${Number(team.funds || 0).toLocaleString()} 💰
                  </td>
                  <td className="p-3 border border-gray-600">
                   {team.stocks && Object.keys(team.stocks).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(team.stocks).map(([stock, quantity]) => (
                        <div key={stock} className="bg-gray-800 p-1 rounded text-white text-sm">
                          <span className="font-bold">{stock}:</span> {quantity}
                        </div>
                      ))}
                    </div>
                   ) : (
                    <span className="text-gray-400">No stocks owned</span>
                   )}
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default TeamList;
