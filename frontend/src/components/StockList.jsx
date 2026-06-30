import { useEffect, useState } from "react";
import { getStocks } from "../services/api";
import { subscribeToStockUpdates, unsubscribeFromEvent } from "../services/socket";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeToEvent  } from "../services/socket"; // ✅ Import WebSocket functions

const StockList = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Fetch stocks when component mounts
    useEffect(() => {
        const fetchStocks = async () => {
            try {
                const stockData = await getStocks();
                if (Array.isArray(stockData)) {
                    setStocks(stockData);
                } else {
                    console.error("⚠️ Unexpected API response:", stockData);
                    setError("⚠️ Failed to load stocks.");
                }
            } catch (err) {
                console.error("❌ Error fetching stocks:", err);
                setError("⚠️ Failed to load stocks.");
            } finally {
                setLoading(false);
            }
        };

        fetchStocks();

         // ✅ Listen for real-time stock updates
    const stockUpdateHandler = (updatedStock) => {
        setStocks((prevStocks) => {
            const exists = prevStocks.some((s) => s.id === updatedStock.id);
            return exists
                ? prevStocks.map((s) => (s.id === updatedStock.id ? updatedStock : s))
                : [...prevStocks, updatedStock];
        });
    };

    subscribeToEvent("stockUpdated", stockUpdateHandler);

    return () => {
        unsubscribeFromEvent("stockUpdated");
    };
}, []);

    return (
        <div className="p-6">
            <h2 className="text-3xl font-bold mb-6 text-cyan-400">📊 Live Stock Market</h2>

            {/* Loader for Initial Fetch */}
            {loading ? (
                <div className="flex justify-center items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : error ? (
                <p className="text-red-400 text-center">{error}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border border-gray-700 rounded-lg shadow-lg bg-gray-900">
                        <thead>
                            <tr className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-lg">
                                <th className="p-3">📈 Stock</th>
                                <th className="p-3">💰 Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {stocks.map((stock) => (
                                    <motion.tr
                                        key={stock.id}
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-center border-b border-gray-700 hover:bg-gray-800 transition-all"
                                    >
                                        <td className="p-3 text-white font-medium">{stock.name}</td>
                                        <td className="p-3 text-green-400 font-bold">
                                            ${Number(stock.price || 0).toFixed(2)}
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StockList;
