import axios from "axios";

const API_URL = "http://localhost:5001/api";

// ✅ Get all teams (Fixes API response parsing)
export const getTeams = async () => {
  try {
      const response = await axios.get(`${API_URL}/teams`);
      return response.data?.data || []; // ✅ Ensure correct response extraction
  } catch (error) {
      console.error("❌ Error fetching teams:", error);
      return [];
  }
};


// ✅ Get a specific team by ID
export const getTeamById = async (teamId) => {
  const response = await axios.get(`${API_URL}/teams/${teamId}`);
  return response.data;
};

// ✅ Disqualify a team
export const disqualifyTeam = async (teamId) => {
  try {
    console.log("📤 Sending disqualifyTeam request:", { teamId });

    const response = await fetch(`/api/teams/${teamId}/disqualify`, { // ✅ Use correct route
      method: "PUT", // ✅ Change to PUT
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    console.log("📥 Response from disqualifyTeam:", data);

    return data;
  } catch (error) {
    console.error("❌ Error disqualifying team:", error);
    return { success: false, message: "⚠️ Failed to disqualify team." };
  }
};


// ✅ Reinstate a disqualified team
export const allowTeam = async (teamId) => {
  const response = await axios.post(`${API_URL}/teams/${teamId}/allow`);
  return response.data;
};

// ✅ Modify team funds (add/deduct money)
export const modifyTeamFunds = async (teamId, amount) => {
  const response = await axios.post(`${API_URL}/teams/${teamId}/modifyFunds`, { amount }); // ✅ Ensure correct method and payload
  return response.data;
};

// ✅ Start a round
export const startRound = async () => {
  const response = await axios.post(`${API_URL}/round/start`);
  return response.data;
};

// ✅ End a round
export const endRound = async () => {
  const response = await axios.post(`${API_URL}/round/end`);
  return response.data;
};

// ✅ Fetch transaction history
export const getTransactions = async () => {
  const response = await axios.get(`${API_URL}/transactions`);
  return response.data;
};

// ✅ Undo last transaction using team name
export const undoLastTransaction = async (teamName) => {
  try {
    // 1️⃣ Fetch all teams and find the ID of the given team name
    const teamsResponse = await fetch("/api/teams"); // ✅ Ensure correct API call
    const teamsData = await teamsResponse.json();

    if (!teamsData.success) {
      throw new Error("⚠️ Failed to fetch teams.");
    }

    const team = teamsData.data.find(t => t.name.toLowerCase() === teamName.toLowerCase());

    if (!team) {
      throw new Error(`⚠️ Team "${teamName}" not found.`);
    }

    // 2️⃣ Send Undo Request with teamId
    const response = await fetch("/api/transactions/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: team.id }) // ✅ Send teamId instead of teamName
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "❌ Failed to undo transaction.");
    }

    return result;
  } catch (error) {
    console.error("❌ Error undoing transaction:", error.message);
    return { success: false, message: error.message };
  }
};





// ✅ Fetch the current round status
export const getRoundStatus = async () => {
  try {
    const response = await axios.get(`${API_URL}/round/status`); // ✅ Ensure this endpoint exists in backend
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching round status:", error);
    return { round: 0, active: false }; // ✅ Return a safe fallback to prevent crash
  }
};



// ✅ Buy stock
export const buyStock = async (teamId, stockId, quantity) => {
  const response = await axios.post(`${API_URL}/transactions/buy`, { teamId, stockId, quantity });
  return response.data;
};

// ✅ Sell stock
export const sellStock = async (teamId, stockId, quantity) => {
  const response = await axios.post(`${API_URL}/transactions/sell`, { teamId, stockId, quantity });
  return response.data;
};

// ✅ Trade stock
export const tradeStock = async (sellerId, buyerId, stockId, quantity, price) => {
  const response = await axios.post(`${API_URL}/transactions/trade`, {
    sellerId,
    buyerId,
    stockId,
    quantity,
    price,
  });
  return response.data;
};

// ✅ Get all stocks (Fixes incorrect parsing)
export const getStocks = async () => {
  try {
    const response = await axios.get(`${API_URL}/stocks`);
    
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    
    console.error("⚠️ Unexpected API response:", response);
    return [];
  } catch (error) {
    console.error("❌ Error fetching stocks:", error);
    return [];
  }
};


// ✅ Add a new stock
export const addStock = async (stockName, stockPrice) => {
  try {
    // ✅ Input Validation
    if (!stockName || typeof stockName !== "string" || stockName.trim() === "") {
      return { success: false, message: "⚠️ Stock name must be a non-empty string." };
    }

    if (stockPrice === undefined || isNaN(stockPrice) || Number(stockPrice) <= 0) {
      return { success: false, message: "⚠️ Stock price must be a valid positive number." };
    }

    console.log("📤 Sending addStock request:", { name: stockName.trim(), price: Number(stockPrice.toFixed(2)) });

    // ✅ API Request (Ensure correct route)
    const response = await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: stockName.trim(),
        price: Number(stockPrice.toFixed(2)), // ✅ Ensure proper number format
      }),
    });

    const data = await response.json(); // ✅ Parse JSON response
    console.log("📥 Response from addStock:", data);

    if (!response.ok) {
      console.error("❌ API Error:", data.message);
      return { success: false, message: data.message || "⚠️ Failed to add stock." };
    }

    return data;
  } catch (error) {
    console.error("❌ Error adding stock:", error);
    return { success: false, message: "⚠️ Network error. Please try again." };
  }
};


// ✅ Remove a stock by ID
export const removeStock = async (stockId) => {
  const response = await axios.delete(`${API_URL}/stocks/${stockId}`);
  return response.data;
};

// ✅ Update stock price
export const updateStockPrice = async (stockId, newPrice) => {
  try {
    console.log("📤 Sending updateStockPrice request:", { stockId, newPrice });

    const response = await fetch(`/api/stocks/${stockId}`, { // ✅ Use correct route
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: newPrice }),
    });

    const data = await response.json();
    console.log("📥 Response from updateStockPrice:", data);

    return data;
  } catch (error) {
    console.error("❌ Error updating stock price:", error);
    return { success: false, message: "⚠️ Failed to update stock price." };
  }
};


// ✅ Add a new team with validation & proper API handling
export const addTeam = async (teamName, initialFunds) => {
  try {
      const response = await axios.post(`${API_URL}/teams`, { // ✅ Ensure correct route
          name: teamName.trim(),
          initialFunds: Number(initialFunds),
      });

      return response.data;
  } catch (error) {
      console.error("❌ Error adding team:", error);
      return { success: false, message: "⚠️ Failed to add team." };
  }
};



/**
 * ✅ Assign stock to a team (Admin only)
 * @param {number} teamId - ID of the team
 * @param {number} stockId - ID of the stock
 * @param {number} quantity - Quantity of stock to assign
 * @returns {Promise} - API response
 */
export const assignStockToTeam = async (teamId, stockId, quantity) => {
  try {
    const response = await axios.post(`${API_URL}/teams/${teamId}/assignStock`, {
      stockId,
      quantity
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error assigning stock:", error);
    throw error;
  }
};

// ✅ Execute Stock Transaction (Buy/Sell)
export const executeTransaction = async (transactionData) => {
  try {
      const endpoint = transactionData.action === "buy"
          ? "/api/transactions/buy"
          : transactionData.action === "sell"
          ? "/api/transactions/sell"
          : "/api/transactions/trade"; // Fix: Use correct route

      const response = await fetch(endpoint, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify(transactionData),
      });

      return await response.json();
  } catch (error) {
      console.error("❌ Error executing transaction:", error);
      return { success: false, message: "Transaction failed." };
  }
};

