import StockList from "../components/StockList";
import { motion } from "framer-motion";

const Stocks = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gray-900 text-white p-8"
    >
      <h2 className="text-4xl font-bold text-green-400 mb-6 text-center">
        📈 Live Stock Market
      </h2>

      <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4 text-blue-400">
          🔥 Market Trends & Prices
        </h3>
        <StockList />
      </div>
    </motion.div>
  );
};

export default Stocks;
