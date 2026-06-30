import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="max-w-3xl mx-auto px-4 py-24 text-center">
    <h1 className="text-5xl font-bold text-brand-700">404</h1>
    <p className="mt-2 text-slate-600">The page you're looking for doesn't exist.</p>
    <Link to="/" className="btn-primary mt-6 inline-flex">Go home</Link>
  </div>
);

export default NotFound;
