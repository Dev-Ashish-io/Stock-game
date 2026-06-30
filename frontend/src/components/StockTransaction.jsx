import { useState, useEffect } from "react";
import { executeTransaction, getTeams, getStocks } from "../services/api";
import { subscribeToEvent, unsubscribeFromEvent } from "../services/socket"; // ✅ FIXED MISSING IMPORT
import { useDispatch } from "react-redux";
import { setStocks } from "../store/stockSlice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";
import PropTypes from "prop-types";

const StockTransaction = ({ stockName = "", currentPrice = 0 }) => {
  const [teams, setTeams] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedStock, setSelectedStock] = useState("");
  const [transactionType, setTransactionType] = useState("buy"); // Default to 'buy'
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const dispatch = useDispatch();

  /*** ✅ Fetch Teams & Stocks on Component Mount ***/
  useEffect(() => {
    const fetchTeamsAndStocks = async () => {
      try {
        setLoadingTeams(true);
        setLoadingStocks(true);

        const teamsData = await getTeams();
        const stocksData = await getStocks();

        if (Array.isArray(teamsData)) setTeams(teamsData);
        else console.error("⚠️ Unexpected Teams API Response:", teamsData);

        if (Array.isArray(stocksData)) setStocks(stocksData);
        else console.error("⚠️ Unexpected Stocks API Response:", stocksData);

        setLoadingTeams(false);
        setLoadingStocks(false);
      } catch (error) {
        console.error("❌ Error fetching teams or stocks:", error);
        setLoadingTeams(false);
        setLoadingStocks(false);
      }
    };

    fetchTeamsAndStocks();

    // ✅ Listen for real-time updates
    const handleNewTeam = (newTeam) => {
      setTeams((prevTeams) => [...prevTeams, newTeam]);
    };

    const handleNewStock = (newStock) => {
      setStocks((prevStocks) => [...prevStocks, newStock]);
    };

    subscribeToEvent("teamUpdated", handleNewTeam);
    subscribeToEvent("stockUpdated", handleNewStock);

    return () => {
      unsubscribeFromEvent("teamUpdated", handleNewTeam);
      unsubscribeFromEvent("stockUpdated", handleNewStock);
    };
  }, []);

  /*** ✅ Handle Stock Transaction Execution ***/
  const handleTransaction = async () => {
    if (!selectedTeam || !selectedStock || !quantity || isNaN(quantity) || quantity <= 0) {
      toast.warn("⚠️ Please select a team, stock, and enter a valid quantity.");
      return;
    }

    try {
      const transactionData = {
        teamId: selectedTeam,
        stockId: selectedStock,
        action: transactionType,
        quantity: parseInt(quantity, 10),
      };

      const result = await executeTransaction(transactionData);

      if (result.success) {
        toast.success(`✅ Successfully ${transactionType}ed ${quantity} shares!`);
        dispatch(setStocks(await getStocks())); // Refresh stocks
        setQuantity("");
      } else {
        toast.error(`❌ Transaction failed: ${result.message}`);
      }
    } catch (error) {
      console.error("❌ Transaction Error:", error);
      toast.error("⚠️ Unable to complete the transaction.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border p-6 rounded-lg bg-gray-900 shadow-lg"
    >
      <h3 className="text-xl font-semibold text-yellow-400">📈 Buy/Sell Stocks</h3>

      {/* Select Team */}
      <label className="block text-gray-300 mt-3">Select Team</label>
      <select
        className="p-2 w-full bg-gray-800 text-white rounded-lg border border-gray-600 focus:ring-blue-400"
        value={selectedTeam}
        onChange={(e) => setSelectedTeam(e.target.value)}
      >
        <option value="">Select Team</option>
        {loadingTeams ? (
          <option disabled>Loading teams...</option>
        ) : teams.length > 0 ? (
          teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} (${team.funds || 0})
            </option>
          ))
        ) : (
          <option disabled>⚠️ No Teams Available</option>
        )}
      </select>

      {/* Select Stock */}
      <label className="block text-gray-300 mt-3">Select Stock</label>
      <select
        className="p-2 w-full bg-gray-800 text-white rounded-lg border border-gray-600 focus:ring-blue-400"
        value={selectedStock}
        onChange={(e) => setSelectedStock(e.target.value)}
      >
        <option value="">Select Stock</option>
        {loadingStocks ? (
          <option disabled>Loading stocks...</option>
        ) : stocks.length > 0 ? (
          stocks.map((stock) => (
            <option key={stock.id} value={stock.id}>
              {stock.name} - ${Number(stock.price).toFixed(2)}
            </option>
          ))
        ) : (
          <option disabled>⚠️ No Stocks Available</option>
        )}
      </select>

      {/* Select Buy/Sell */}
      <div className="flex justify-between mt-4">
        <button
          className={`w-1/2 py-2 rounded-l-lg font-bold transition-colors ${
            transactionType === "buy" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-gray-700"
          }`}
          onClick={() => setTransactionType("buy")}
        >
          Buy
        </button>
        <button
          className={`w-1/2 py-2 rounded-r-lg font-bold transition-colors ${
            transactionType === "sell" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-gray-700"
          }`}
          onClick={() => setTransactionType("sell")}
        >
          Sell
        </button>
      </div>

      {/* Quantity Input */}
      <label className="block text-gray-300 mt-3">Enter Quantity</label>
      <input
        type="number"
        className="p-3 w-full bg-gray-800 text-white rounded-lg border border-gray-600 focus:ring-blue-400"
        placeholder="Enter quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />

      {/* Submit Transaction */}
      <button
        className={`mt-4 w-full py-2 rounded-lg font-bold transition-all ${
          transactionType === "buy" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
        }`}
        onClick={handleTransaction}
      >
        {transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} Stock
      </button>
    </motion.div>
  );
};

// ✅ Prop Validation
StockTransaction.propTypes = {
  stockName: PropTypes.string,
  currentPrice: PropTypes.number,
};

export default StockTransaction;
