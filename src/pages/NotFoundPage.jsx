import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <span className="text-6xl mb-4 block">🗺️</span>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Page not found</h1>
        <p className="text-text-tertiary mb-6">Looks like you wandered too far from campus</p>
        <Link to="/dashboard">
          <Button size="lg">Back to Dashboard</Button>
        </Link>
      </motion.div>
    </div>
  );
}
