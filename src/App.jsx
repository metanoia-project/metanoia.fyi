import { Routes, Route } from 'react-router-dom';
import Index from './pages/Index.jsx';
import Join from './pages/Join.jsx';
import Face from './pages/Face.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/join" element={<Join />} />
      <Route path="/face" element={<Face />} />
    </Routes>
  );
}
