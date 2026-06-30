import { motion } from "framer-motion";

const Loader = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-40 backdrop-blur-sm"
    >
      <div className="relative flex justify-center items-center">
        {/* Outer Glow Effect */}
        <div className="absolute w-16 h-16 bg-blue-500 opacity-30 rounded-full animate-ping"></div>

        {/* Gradient Spinner */}
        <div className="w-14 h-14 border-4 border-transparent border-t-blue-500 border-b-cyan-400 rounded-full animate-spin"></div>
      </div>
    </motion.div>
  );
};

export default Loader;
