import React, { useEffect, useState } from "react";
import { getTeams, getStocks, executeTransaction } from "../services/api";
import { subscribeToEvent, unsubscribeFromEvent } from "../services/socket";
import { toast } from "react-toastify";

const TeamTrade = () => {
  const [teams, setTeams] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [seller, setSeller] = useState("");
  const [buyer, setBuyer] = useState("");
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    const fetchTeamsAndStocks = async () => {
      try {
        setLoadingTeams(true);
        setLoadingStocks(true);

        const teamsData = await getTeams();
        const stocksData = await getStocks();

        if (Array.isArray(teamsData)) setTeams(teamsData);
        if (Array.isArray(stocksData)) setStocks(stocksData);

        setLoadingTeams(false);
        setLoadingStocks(false);
      } catch (error) {
        console.error("❌ Error fetching teams or stocks:", error);
        toast.error("⚠️ Failed to load teams or stocks.");
        setLoadingTeams(false);
        setLoadingStocks(false);
      }
    };

    fetchTeamsAndStocks();

    // ✅ Listen for real-time team and stock updates
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

  const handleTrade = async () => {
    if (!seller || !buyer || !stock || !price || !quantity) {
      toast.warn("⚠️ All fields are required!");
      return;
    }

    if (seller === buyer) {
      toast.error("❌ Seller and Buyer cannot be the same team!");
      return;
    }

    if (isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
      toast.error("⚠️ Enter valid price and quantity!");
      return;
    }

    try {
      await executeTransaction({
        seller,
        buyer,
        stock,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
      });

      toast.success("✅ Trade successfully executed!");
      setSeller("");
      setBuyer("");
      setStock("");
      setPrice("");
      setQuantity("");
    } catch (error) {
      console.error("❌ Trade failed:", error);
      toast.error("❌ Error: Unable to execute trade.");
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-gray-900 shadow-lg transition duration-300 hover:shadow-xl">
      <h3 className="text-2xl font-semibold mb-4 text-cyan-400">🔄 Team-to-Team Trade</h3>

      {/* Seller Selection */}
      <label className="block text-gray-300 mb-1">Select Seller</label>
      <select
        className="w-full p-2 bg-gray-800 text-white mb-2 rounded focus:ring focus:ring-blue-500"
        value={seller}
        onChange={(e) => setSeller(e.target.value)}
      >
        <option value="">Select Seller</option>
        {loadingTeams ? (
          <option disabled>Loading teams...</option>
        ) : teams.length > 0 ? (
          teams.map((team) => (
            <option key={team.id} value={team.name}>
              {team.name}
            </option>
          ))
        ) : (
          <option disabled>⚠️ No Teams Available</option>
        )}
      </select>

      {/* Buyer Selection */}
      <label className="block text-gray-300 mb-1">Select Buyer</label>
      <select
        className="w-full p-2 bg-gray-800 text-white mb-2 rounded focus:ring focus:ring-blue-500"
        value={buyer}
        onChange={(e) => setBuyer(e.target.value)}
      >
        <option value="">Select Buyer</option>
        {loadingTeams ? (
          <option disabled>Loading teams...</option>
        ) : teams.length > 0 ? (
          teams.map((team) => (
            <option key={team.id} value={team.name}>
              {team.name}
            </option>
          ))
        ) : (
          <option disabled>⚠️ No Teams Available</option>
        )}
      </select>

      {/* Stock Selection */}
      <label className="block text-gray-300 mb-1">Select Stock</label>
      <select
        className="w-full p-2 bg-gray-800 text-white mb-2 rounded focus:ring focus:ring-blue-500"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
      >
        <option value="">Select Stock</option>
        {loadingStocks ? (
          <option disabled>Loading stocks...</option>
        ) : stocks.length > 0 ? (
          stocks.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))
        ) : (
          <option disabled>⚠️ No Stocks Available</option>
        )}
      </select>

      {/* Price Input */}
      <label className="block text-gray-300 mb-1">Price Per Share</label>
      <input
        type="number"
        className="w-full p-2 bg-gray-800 text-white mb-2 rounded focus:ring focus:ring-blue-500"
        placeholder="Enter Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      {/* Quantity Input */}
      <label className="block text-gray-300 mb-1">Quantity</label>
      <input
        type="number"
        className="w-full p-2 bg-gray-800 text-white mb-2 rounded focus:ring focus:ring-blue-500"
        placeholder="Enter Quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />

      {/* Execute Trade Button */}
      <button className="w-full btn btn-light-blue mt-3" onClick={handleTrade}>
        🚀 Execute Trade
      </button>
    </div>
  );
};

export default TeamTrade;
