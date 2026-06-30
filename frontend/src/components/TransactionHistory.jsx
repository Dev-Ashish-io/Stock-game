import { useEffect, useState } from "react";
import { getTransactions } from "../services/api";
import { subscribeToUpdates , getSocket } from "../services/socket"; // ✅ Fixed Import
import { motion } from "framer-motion";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi"; // ✅ Buy/Sell Icons
import { BiTime } from "react-icons/bi"; // ✅ Time Icon
import { MdOutlineSync } from "react-icons/md"; // ✅ Round Start/End Icon
import { subscribeToEvent, unsubscribeFromEvent } from "../services/socket"; // ✅ Import WebSocket functions



const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(""); // ✅ State for transaction filter

  // ✅ Fetch Transactions & Listen for Live Updates
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await getTransactions();

        if (response && Array.isArray(response.data)) {
          setTransactions(response.data);
        } else {
          console.error("⚠️ Unexpected API response:", response);
          setTransactions([]);
        }
      } catch (error) {
        console.error("❌ Error fetching transactions:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

 // ✅ Listen for real-time transaction updates
 const transactionUpdateHandler = (updatedTransaction) => {
  setTransactions((prevTransactions) => [updatedTransaction, ...prevTransactions]);
};

subscribeToEvent("transactionUpdated", transactionUpdateHandler);

return () => {
  unsubscribeFromEvent("transactionUpdated");
};
}, []);


  // ✅ Filter transactions based on user selection
  const filteredTransactions = transactions.filter((t) =>
    filter ? t.action === filter : true
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="transactions-card"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
          <BiTime className="text-yellow-400" /> Transaction History
        </h2>
        {/* 🔹 Filter Dropdown */}
        <select
          className="bg-gray-800 text-white p-2 rounded-md"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="buy">Buys</option>
          <option value="sell">Sells</option>
          <option value="trade">Trades</option>
        </select>
      </div>

      {loading ? (
        <p className="transactions-loading">Fetching transactions...</p>
      ) : transactions.length === 0 ? (
        <p className="transactions-no-data">No transactions recorded yet.</p>
      ) : (
        <div className="transactions-table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="p-3 border border-gray-600">Time</th>
                <th className="p-3 border border-gray-600">Team</th>
                <th className="p-3 border border-gray-600">Action</th>
                <th className="p-3 border border-gray-600">Stock</th>
                <th className="p-3 border border-gray-600">Price</th>
                <th className="p-3 border border-gray-600">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction, index) => (
                <tr
                  key={index}
                  className="text-center hover:bg-gray-800 transition duration-200"
                >
                  <td className="p-3 border border-gray-600">
                    {new Date(transaction.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 border border-gray-600">
                    {transaction.team_name || "—"}
                  </td>
                  <td className="p-3 border border-gray-600">
                    {transaction.round_start ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <MdOutlineSync /> Round {transaction.round} Started
                      </span>
                    ) : transaction.round_end ? (
                      <span className="text-red-400 flex items-center gap-1">
                        <MdOutlineSync /> Round {transaction.round} Ended
                      </span>
                    ) : transaction.action === "buy" ? (
                      <span className="text-green-500 flex items-center gap-1">
                        <FiTrendingUp /> Buy
                      </span>
                    ) : transaction.action === "sell" ? (
                      <span className="text-red-500 flex items-center gap-1">
                        <FiTrendingDown /> Sell
                      </span>
                    ) : (
                      <span className="text-blue-400">{transaction.action}</span>
                    )}
                  </td>
                  <td className="p-3 border border-gray-600">{transaction.stock_name || "—"}</td>
                  <td className="p-3 border border-gray-600">${transaction.price || "—"}</td>
                  <td className="p-3 border border-gray-600">{transaction.quantity || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default TransactionHistory;
