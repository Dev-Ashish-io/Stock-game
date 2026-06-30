import { db } from "../config/db.js";
import { getCache, setCache, deleteCache } from "../config/redis.js";
import logger from "../config/logger.js"; // ✅ Import logger
import { io, emitWebSocketEvent } from "../socket.js"; // ✅ Import WebSocket instance


// ✅ Ensure WebSocket is initialized before emitting events
const emitEvent = (event, data) => {
    if (io) {
        io.emit(event, data);
    } else {
        logger.warn(`⚠️ WebSocket not initialized. Skipping event: ${event}`);
    }
};


/**
 * ✅ Buy Stock with WebSocket Event
 */
export const buyStock = async (req, res) => {
    try {
      const { teamId, stockId, quantity } = req.body;
  
      if (!teamId || !stockId || !quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: "⚠️ Invalid input data." });
      }
  
      const stock = await db.oneOrNone("SELECT price FROM stocks WHERE id = $1", [stockId]);
      if (!stock) return res.status(404).json({ success: false, message: "⚠️ Stock not found." });
  
      const team = await db.oneOrNone("SELECT funds FROM teams WHERE id = $1", [teamId]);
      if (!team) return res.status(404).json({ success: false, message: "⚠️ Team not found." });
  
      const totalCost = stock.price * quantity;
  
      if (team.funds < totalCost) {
        return res.status(400).json({ success: false, message: "⚠️ Insufficient funds." });
      }
  
      // ✅ Perform Transaction (Atomic)
      const transaction = await db.tx(async (t) => {
        await t.none("UPDATE teams SET funds = funds - $1 WHERE id = $2", [totalCost, teamId]);
  
        await t.none(
          "INSERT INTO transactions (team_id, stock_id, quantity, action, price, created_at) VALUES ($1, $2, $3, 'buy', $4, NOW())",
          [teamId, stockId, quantity, stock.price]
        );
  
        await t.none(
          "INSERT INTO team_stocks (team_id, stock_id, quantity) VALUES ($1, $2, $3) ON CONFLICT (team_id, stock_id) DO UPDATE SET quantity = team_stocks.quantity + $3",
          [teamId, stockId, quantity]
        );
      });
  
      io.emit("transactionUpdated", { teamId, stockId, quantity, action: "buy" });
  
      res.status(200).json({
        success: true,
        message: "✅ Stock bought successfully!",
      });
  
    } catch (error) {
      console.error("❌ Error buying stock:", error);
      res.status(500).json({ success: false, message: "Internal Server Error." });
    }
  };
  
  
/**
* ✅ Sell Stock with WebSocket Event
*/
export const sellStock = async (req, res) => {
    try {
        const { teamId, stockId, quantity } = req.body;

        // ✅ Validate Input
        if (!teamId || !stockId || !quantity || isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({ success: false, message: "⚠️ Invalid input data." });
        }

        // ✅ Get Stock Price (Try Cache First)
        const stockPriceCacheKey = `stock_price:${stockId}`;
        let stockPrice = await getCache(stockPriceCacheKey);

        if (!stockPrice) {
            const stock = await db.oneOrNone("SELECT price FROM stocks WHERE id = $1", [stockId]);
            if (!stock) return res.status(404).json({ success: false, message: "⚠️ Stock not found." });

            stockPrice = stock.price;
            await setCache(stockPriceCacheKey, stockPrice, 60);
        }

        // ✅ Get Team's Stock Holdings
        const teamStock = await db.oneOrNone("SELECT quantity FROM team_stocks WHERE team_id = $1 AND stock_id = $2", [
            teamId,
            stockId,
        ]);

        if (!teamStock || teamStock.quantity < quantity) {
            return res.status(400).json({ success: false, message: "⚠️ Not enough stock to sell." });
        }

        const revenue = stockPrice * quantity;

        // ✅ Perform Transaction (Atomic)
        const transaction = await db.tx(async (t) => {
            await t.none("UPDATE teams SET funds = funds + $1 WHERE id = $2", [revenue, teamId]);
            await t.none(
                "UPDATE team_stocks SET quantity = quantity - $1 WHERE team_id = $2 AND stock_id = $3",
                [quantity, teamId, stockId]
            );
            return t.one(
                "INSERT INTO transactions (team_id, stock_id, quantity, action, price) VALUES ($1, $2, $3, 'sell', $4) RETURNING *",
                [teamId, stockId, quantity, stockPrice]
            );
        });



        await deleteCache(`team:${teamId}`); // ✅ Invalidate team funds cache

        // ✅ Emit real-time transaction update
        io.emit("transactionUpdated", transaction);

        // ✅ Emit WebSocket Events
        emitWebSocketEvent("newTransaction", transaction, "/teams"); // Notify about new transaction
        emitWebSocketEvent("fundsUpdated", { teamId, funds: teamStock.funds + revenue }, "/teams"); // Update funds
        emitWebSocketEvent("stockPriceUpdated", { stockId, price: stockPrice }, "/stocks"); // Update stock price (if dynamic)

        res.status(200).json({ success: true, message: "✅ Stock sold successfully!", data: transaction });
    } catch (error) {
        logger.error("❌ Error selling stock:", error);
        res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};


/**
 * ✅ Undo Last Transaction (Only for the requesting user)
 */
export const undoLastTransaction = async (req, res) => {
    try {
        const { teamId } = req.body;

        // ✅ Validate Input
        if (!teamId || isNaN(parseInt(teamId))) {
            return res.status(400).json({ success: false, message: "⚠️ Invalid Team ID." });
        }

        // ✅ Fetch the last transaction for the team
        const lastTransaction = await db.oneOrNone(
            "SELECT * FROM transactions WHERE team_id = $1 ORDER BY created_at DESC LIMIT 1",
            [teamId]
        );

        if (!lastTransaction) {
            return res.status(404).json({ success: false, message: "⚠️ No recent transactions found for this team!" });
        }

        const { stock_id, quantity, action, price, buyer_id, seller_id } = lastTransaction;
        let updatedSellerFunds = null;
        let updatedBuyerFunds = null;

        // ✅ Perform database transaction to revert the last transaction
        await db.tx(async (t) => {
            if (action === "buy") {
                // ✅ Reverse Buy Transaction: Refund team & remove stock
                await t.none("UPDATE teams SET funds = funds + $1 WHERE id = $2", [price * quantity, teamId]);
                await t.none("UPDATE team_stocks SET quantity = quantity - $1 WHERE team_id = $2 AND stock_id = $3", [
                    quantity, teamId, stock_id
                ]);

                updatedSellerFunds = await t.one("SELECT funds FROM teams WHERE id = $1", [teamId]);
            } else if (action === "sell") {
                // ✅ Reverse Sell Transaction: Deduct money & give back stocks
                await t.none("UPDATE teams SET funds = funds - $1 WHERE id = $2", [price * quantity, teamId]);
                await t.none("UPDATE team_stocks SET quantity = quantity + $1 WHERE team_id = $2 AND stock_id = $3", [
                    quantity, teamId, stock_id
                ]);

                updatedSellerFunds = await t.one("SELECT funds FROM teams WHERE id = $1", [teamId]);
            } else if (action === "trade") {
                // ✅ Reverse Trade Transaction: Swap back stocks and money
                await t.none("UPDATE teams SET funds = funds + $1 WHERE id = $2", [price * quantity, buyer_id]);
                await t.none("UPDATE teams SET funds = funds - $1 WHERE id = $2", [price * quantity, seller_id]);
                await t.none("UPDATE team_stocks SET quantity = quantity - $1 WHERE team_id = $2 AND stock_id = $3", [
                    quantity, buyer_id, stock_id
                ]);
                await t.none("UPDATE team_stocks SET quantity = quantity + $1 WHERE team_id = $2 AND stock_id = $3", [
                    quantity, seller_id, stock_id
                ]);

                updatedSellerFunds = await t.one("SELECT funds FROM teams WHERE id = $1", [seller_id]);
                updatedBuyerFunds = await t.one("SELECT funds FROM teams WHERE id = $1", [buyer_id]);
            }

            // ✅ Remove the transaction from history
            await t.none("DELETE FROM transactions WHERE id = $1", [lastTransaction.id]);
        });

        // ✅ Invalidate cache for affected teams
        await deleteCache(`team:${teamId}`);
        if (buyer_id) await deleteCache(`team:${buyer_id}`);
        if (seller_id) await deleteCache(`team:${seller_id}`);

        // ✅ Emit WebSocket Events to update frontend in real-time
        emitWebSocketEvent("transactionReverted", { teamId, stock_id, action }, "/teams");
        if (updatedSellerFunds)
            emitWebSocketEvent("fundsUpdated", { teamId: seller_id, funds: updatedSellerFunds.funds }, "/teams");
        if (updatedBuyerFunds)
            emitWebSocketEvent("fundsUpdated", { teamId: buyer_id, funds: updatedBuyerFunds.funds }, "/teams");

        res.status(200).json({ success: true, message: "✅ Last transaction undone successfully!" });
    } catch (error) {
        console.error("❌ Error undoing last transaction:", error);
        res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};



/**
 * ✅ Trade Stock (Between Teams) with WebSocket Updates
 */
export const tradeStock = async (req, res) => {
    try {
        const { sellerId, buyerId, stockId, quantity, price } = req.body;

        // ✅ Validate Input
        if (!sellerId || !buyerId || !stockId || !quantity || !price || isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
            return res.status(400).json({ success: false, message: "⚠️ Invalid input data." });
        }

        if (sellerId === buyerId) {
            return res.status(400).json({ success: false, message: "⚠️ A team cannot trade with itself." });
        }

        // ✅ Get Seller's Stock Holdings
        const sellerStock = await db.oneOrNone("SELECT quantity FROM team_stocks WHERE team_id = $1 AND stock_id = $2", [
            sellerId,
            stockId,
        ]);

        if (!sellerStock || sellerStock.quantity < quantity) {
            return res.status(400).json({ success: false, message: "⚠️ Seller does not have enough stock." });
        }

        // ✅ Get Buyer's Funds
        const buyer = await db.oneOrNone("SELECT funds FROM teams WHERE id = $1", [buyerId]);

        if (!buyer || buyer.funds < price * quantity) {
            return res.status(400).json({ success: false, message: "⚠️ Buyer has insufficient funds." });
        }

        // ✅ Perform Trade Transaction (Atomic)
        const transaction = await db.tx(async (t) => {
            await t.none("UPDATE team_stocks SET quantity = quantity - $1 WHERE team_id = $2 AND stock_id = $3", [
                quantity,
                sellerId,
                stockId,
            ]);
            await t.none(
                "INSERT INTO team_stocks (team_id, stock_id, quantity) VALUES ($1, $2, $3) ON CONFLICT (team_id, stock_id) DO UPDATE SET quantity = team_stocks.quantity + $3",
                [buyerId, stockId, quantity]
            );
            await t.none("UPDATE teams SET funds = funds - $1 WHERE id = $2", [price * quantity, buyerId]);
            await t.none("UPDATE teams SET funds = funds + $1 WHERE id = $2", [price * quantity, sellerId]);
            return t.one(
                "INSERT INTO transactions (team_id, stock_id, quantity, action, price) VALUES ($1, $2, $3, 'trade', $4) RETURNING *",
                [buyerId, stockId, quantity, price]
            );
        });

        // ✅ Invalidate Caches
        await deleteCache(`team:${sellerId}`);
        await deleteCache(`team:${buyerId}`);

        // ✅ Emit real-time transaction update
        io.emit("transactionUpdated", transaction);

        // ✅ Emit WebSocket Events
        emitWebSocketEvent("newTransaction", transaction, "/teams"); // Notify about new trade
        emitWebSocketEvent("fundsUpdated", { teamId: sellerId, funds: sellerStock.funds + price * quantity }, "/teams"); // Update seller funds
        emitWebSocketEvent("fundsUpdated", { teamId: buyerId, funds: buyer.funds - price * quantity }, "/teams"); // Update buyer funds
        emitWebSocketEvent("stockPriceUpdated", { stockId, price }, "/stocks"); // Update stock price (if applicable)

        res.status(200).json({ success: true, message: "✅ Stock trade completed successfully!", data: transaction });
    } catch (error) {
        logger.error("❌ Error trading stock:", error);
        res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};

/**
 * ✅ Get All Transactions (With Caching & Real-Time WebSocket Updates)
 */
export const getTransactions = async (req, res) => {
    try {
        const cacheKey = "transactions";
        const cachedTransactions = await getCache(cacheKey);

        // ✅ If Cached Data Exists, Return It
        if (cachedTransactions) {
            return res.status(200).json({
                success: true,
                message: "✅ Cached transactions retrieved successfully!",
                data: formatTransactions(cachedTransactions), // ✅ Ensure consistent formatting
            });
        }

        // ✅ Fetch Transactions (Sorted by Most Recent)
        const transactions = await db.any(`
            SELECT t.id, t.team_id, tm.name AS team_name, t.stock_id, s.name AS stock_name, 
                   t.quantity, t.price, t.action, t.created_at 
            FROM transactions t
            LEFT JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN stocks s ON t.stock_id = s.id
            ORDER BY t.created_at DESC
        `);

        // ✅ Format Transactions Data for Consistency
        const formattedTransactions = formatTransactions(transactions);

        // ✅ Cache Transactions for 60 Seconds
        await setCache(cacheKey, formattedTransactions, 60);

        // ✅ Emit WebSocket Event for Live Updates
        emitWebSocketEvent("transactionsUpdated", formattedTransactions, "/transactions");

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Expires", "0"); // Prevents caching
        
        res.status(200).json({
            success: true,
            message: "✅ Transactions retrieved successfully!",
            data: transactions,
        });

    } catch (error) {
        logger.error("❌ Error fetching transactions:", error);
        res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};

/**
 * ✅ Helper Function: Format Transactions for Consistency
 */
const formatTransactions = (transactions) => {
    return transactions.map(transaction => ({
        id: transaction.id,
        team_id: transaction.team_id,
        team_name: transaction.team_name || "N/A", // ✅ Ensure fallback if null
        stock_id: transaction.stock_id,
        stock_name: transaction.stock_name || "N/A",
        quantity: transaction.quantity,
        price: transaction.price,
        action: transaction.action,
        created_at: new Date(transaction.created_at).toISOString(), // ✅ Ensure uniform date format
    }));
};

export const getLastTransaction = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId || isNaN(parseInt(teamId))) {
            return res.status(400).json({ success: false, message: "⚠️ Invalid Team ID" });
        }

        const lastTransaction = await db.oneOrNone(
            "SELECT * FROM transactions WHERE team_id = $1 ORDER BY created_at DESC LIMIT 1",
            [teamId]
        );

        if (!lastTransaction) {
            return res.status(404).json({ success: false, message: "⚠️ No transactions found for this team." });
        }

        res.status(200).json({ success: true, data: lastTransaction });
    } catch (error) {
        console.error("❌ Error fetching last transaction:", error);
        res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};
