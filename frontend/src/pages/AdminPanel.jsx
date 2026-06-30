import { useState, useEffect, useCallback } from "react";
import {
  getTeams,
  getStocks,
  assignStockToTeam,
  disqualifyTeam,
  allowTeam,
  addStock,
  removeStock,
  modifyTeamFunds,
  updateStockPrice,
  addTeam
} from "../services/api";

import {
  subscribeToEvent,
  unsubscribeFromEvent,
  subscribeToStockUpdates,
  getSocket
} from "../services/socket"; // ✅ FIXED IMPORT

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion"; // ✅ Animations

const AdminPanel = () => {
  const [teams, setTeams] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [disqualifiedTeams, setDisqualifiedTeams] = useState([]);
  const [newStock, setNewStock] = useState({ name: "", price: "" });
  const [newTeam, setNewTeam] = useState("");
  const [initialFunds, setInitialFunds] = useState("");
  const [stockAssignment, setStockAssignment] = useState({ teamId: "", stockId: "", quantity: "" });
  const [stockUpdate, setStockUpdate] = useState({ stockId: "", price: "" });
  const [fundModification, setFundModification] = useState({ teamId: "", amount: "" });
  const [removeStockId, setRemoveStockId] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedStock, setSelectedStock] = useState("");

  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);

  /*** ✅ Fetch Teams & Stocks ***/
  const fetchData = useCallback(async () => {
    try {
      setLoadingTeams(true);
      setLoadingStocks(true);

      const teamsData = await getTeams();
      const stockData = await getStocks();

      setTeams(Array.isArray(teamsData) ? teamsData.filter((team) => !team.disqualified) : []);
      setDisqualifiedTeams(Array.isArray(teamsData) ? teamsData.filter((team) => team.disqualified) : []);
      setStocks(Array.isArray(stockData) ? stockData : []);
      

      setLoadingTeams(false);
      setLoadingStocks(false);
    } catch (error) {
      console.error("❌ Error fetching teams or stocks:", error);
      toast.error("⚠️ Failed to load teams or stocks.");
      setLoadingTeams(false);
      setLoadingStocks(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
   

    // ✅ Listen for real-time updates
    subscribeToEvent("teamUpdated", fetchData);
    subscribeToEvent("stockUpdated", fetchData);

    return () => {
      unsubscribeFromEvent("teamUpdated", fetchData);
      unsubscribeFromEvent("stockUpdated", fetchData);
    };
  }, [fetchData]);

  /*** ✅ Refresh Data After Any Operation ***/
  const refreshData = async () => {
    fetchData();
  };

  /*** ✅ Subscribe to Real-time Stock Updates ***/
  useEffect(() => {
    // ✅ Fetch Initial Stocks
    const fetchStocks = async () => {
      const stockData = await getStocks();
      setStocks(stockData);
    };

    fetchStocks();

    // ✅ Listen for stock updates and update dropdown dynamically
    subscribeToStockUpdates((updatedStock) => {
      setStocks((prevStocks) => {
        const stockExists = prevStocks.some(stock => stock.id === updatedStock.stockId);
        return stockExists
          ? prevStocks.map(stock => stock.id === updatedStock.stockId ? { ...stock, price: updatedStock.price } : stock)
          : [...prevStocks, updatedStock]; // 🔥 Add new stock to dropdown if not present
      });
    });

    return () => {
      unsubscribeFromEvent("stockUpdated");
    };
  }, []);

  /*** ✅ Assign Stock to Team ***/
  const handleAssignStock = async () => {
    const { teamId, stockId, quantity } = stockAssignment;
    if (!teamId || !stockId || !quantity || quantity <= 0) {
      toast.warn("⚠️ Please select a team, stock, and enter a valid quantity.");
      return;
    }

    try {
      await assignStockToTeam(teamId, stockId, parseInt(quantity));
      toast.success("✅ Stock assigned successfully!");
      setStockAssignment({ teamId: "", stockId: "", quantity: "" });
      refreshData();
    } catch (error) {
      toast.error("❌ Failed to assign stock.");
    }
  };

  /*** ✅ Disqualify Team ***/
  const handleDisqualifyTeam = async () => {
    if (!selectedTeam) {
      toast.warn("⚠️ Select a team to disqualify.");
      return;
    }
    await disqualifyTeam(selectedTeam);
    setSelectedTeam("");
    toast.error("❌ Team disqualified!");
    refreshData();
  };

  /*** ✅ Reinstate Disqualified Team ***/
  const handleAllowTeam = async (teamName) => {
    await allowTeam(teamName);
    toast.success("✅ Team reinstated!");
    refreshData();
  };

  /*** ✅ Add New Stock ***/
  const handleAddStock = async () => {
    if (!newStock.name || isNaN(newStock.price) || newStock.price <= 0) {
      toast.warn("⚠️ Enter a valid stock name and price.");
      return;
    }
    try {
      const addedStock = await addStock(newStock);
      toast.success("✅ New stock added!");

      // ✅ Emit WebSocket Event
      const socket = getSocket();
      socket.emit("stockUpdated", addedStock);

      setNewStock({ name: "", price: "" });
      fetchData();
    } catch (error) {
      toast.error("❌ Failed to add stock.");
    }
  };

  /*** ✅ Remove Stock ***/
  const handleRemoveStock = async () => {
    if (!removeStockId) {
      toast.warn("⚠️ Select a stock to remove.");
      return;
    }
    try {
      await removeStock(removeStockId);
      toast.success("❌ Stock removed successfully!");
      setRemoveStockId("");
      fetchData();
    } catch (error) {
      toast.error("❌ Failed to remove stock.");
    }
  };

  /*** ✅ Modify Team Funds ***/
  const handleModifyFunds = async () => {
    const { teamId, amount } = fundModification;
    if (!teamId || !amount) {
      toast.warn("⚠️ Select a team and enter an amount.");
      return;
    }

    try {
      await modifyTeamFunds(teamId, parseFloat(amount));
      toast.success("💰 Team funds updated!");
      setFundModification({ teamId: "", amount: "" });
      refreshData();
    } catch (error) {
      toast.error("❌ Failed to modify funds.");
    }
  };

  /*** ✅ Add New Team ***/
  const handleAddTeam = async () => {
    if (!newTeam || isNaN(initialFunds) || initialFunds < 0) {
      toast.warn("⚠️ Enter a valid team name and initial funds.");
      return;
    }
    try {
      await addTeam(newTeam, Number(initialFunds));
      toast.success("✅ New team added!");
      setNewTeam("");
      setInitialFunds("");
      fetchData();
    } catch (error) {
      toast.error("❌ Failed to add team.");
    }
  };

  /*** ✅ Update Stock Price ***/
  const handleUpdateStockPrice = async () => {
    if (!stockUpdate.stockId || isNaN(stockUpdate.price) || stockUpdate.price <= 0) {
      toast.warn("⚠️ Select a stock and enter a valid price.");
      return;
    }
    try {
      await updateStockPrice(stockUpdate.stockId, Number(stockUpdate.price));
      toast.success("📈 Stock price updated!");
      setStockUpdate({ stockId: "", price: "" });
      fetchData();
    } catch (error) {
      toast.error("❌ Failed to update stock price.");
    }
  };



  return (
    <div className="admin-container">
      <h2 className="admin-title">📊 Admin Panel</h2>

      {/* Add Team */}
      <div className="admin-card">
        <h3 className="admin-subtitle">🏆 Add New Team</h3>
        <input type="text" className="input-box" placeholder="Team Name" value={newTeam} onChange={(e) => setNewTeam(e.target.value)} />
        <input type="number" className="input-box" placeholder="Initial Funds" value={initialFunds} onChange={(e) => setInitialFunds(e.target.value)} />
        <button className="btn btn-green" onClick={handleAddTeam}>Add Team</button>
      </div>

      {/* Add Stock */}
      <div className="admin-card">
        <h3 className="admin-subtitle">📈 Add New Stock</h3>
        <input type="text" className="input-box" placeholder="Stock Name" value={newStock.name} onChange={(e) => setNewStock({ ...newStock, name: e.target.value })} />
        <input type="number" className="input-box" placeholder="Initial Price" value={newStock.price} onChange={(e) => setNewStock({ ...newStock, price: e.target.value })} />
        <button className="btn btn-green" onClick={handleAddStock}>Add Stock</button>
      </div>

      {/* Update Stock Price */}
      <div className="admin-card">
        <h3 className="admin-subtitle">💹 Update Stock Price</h3>
        <select className="dropdown" onChange={(e) => setStockUpdate({ ...stockUpdate, stockId: e.target.value })} value={stockUpdate.stockId}>
          <option value="">Select Stock</option>
          {stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.name}</option>)}
        </select>
        <input type="number" className="input-box" placeholder="New Price" value={stockUpdate.price} onChange={(e) => setStockUpdate({ ...stockUpdate, price: e.target.value })} />
        <button className="btn btn-blue" onClick={handleUpdateStockPrice}>Update Price</button>
      </div>

      {/* Assign Stock to a Team */}
      <div className="admin-card">
        <h3 className="admin-subtitle">📌 Assign Stock to a Team</h3>
        <select className="dropdown" onChange={(e) => setStockAssignment({ ...stockAssignment, teamId: e.target.value })} value={stockAssignment.teamId}>
          <option value="">Select Team</option>
          {loadingTeams ? <option disabled>Loading teams...</option> : teams.length > 0 ? teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          )) : <option disabled>⚠️ No Teams Available</option>}
        </select>

        <select className="dropdown" onChange={(e) => setStockAssignment({ ...stockAssignment, stockId: e.target.value })} value={stockAssignment.stockId}>
          <option value="">Select Stock</option>
          {loadingStocks ? <option disabled>Loading stocks...</option> : stocks.length > 0 ? stocks.map((stock) => (
            <option key={stock.id} value={stock.id}>{stock.name}</option>
          )) : <option disabled>⚠️ No Stocks Available</option>}
        </select>

        <input type="number" className="input-box" placeholder="Quantity" value={stockAssignment.quantity} onChange={(e) => setStockAssignment({ ...stockAssignment, quantity: e.target.value })} />
        <button className="btn btn-blue" onClick={handleAssignStock}>Assign Stock</button>
      </div>

      {/* Modify Team Funds */}
      <div className="admin-card">
        <h3 className="admin-subtitle">💰 Modify Team Funds</h3>
        <select className="dropdown" onChange={(e) => setFundModification({ ...fundModification, teamId: e.target.value })} value={fundModification.teamId}>
          <option value="">Select Team</option>
          {loadingTeams ? (
            <option disabled>Loading teams...</option>
          ) : teams.length > 0 ? (
            teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))
          ) : (
            <option disabled>⚠️ No Teams Available</option>
          )}
        </select>
        <input type="number" className="input-box" placeholder="Enter Amount" value={fundModification.amount} onChange={(e) => setFundModification({ ...fundModification, amount: e.target.value })} />
        <button className="btn btn-blue" onClick={handleModifyFunds}>Modify Funds</button>
      </div>

      {/* Remove Stock */}
      <div className="admin-card">
        <h3 className="admin-subtitle">🗑️ Remove Stock</h3>
        <select className="dropdown" onChange={(e) => setRemoveStockId(e.target.value)} value={removeStockId}>
          <option value="">Select Stock</option>
          {stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.name}</option>)}
        </select>
        <button className="btn btn-red" onClick={handleRemoveStock}>Remove Stock</button>
      </div>

      {/* Disqualify Team */}
      <div className="admin-card">
        <h3 className="admin-subtitle">🚫 Disqualify a Team</h3>
        <select className="dropdown" onChange={(e) => setSelectedTeam(e.target.value)} value={selectedTeam}>
          <option value="">Select Team</option>
          {loadingTeams ? <option disabled>Loading teams...</option> : teams.length > 0 ? teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          )) : <option disabled>⚠️ No Teams Available</option>}
        </select>
        <button className="btn btn-red" onClick={handleDisqualifyTeam}>Disqualify Team</button>
      </div>
    </div>
  );
};

export default AdminPanel;
