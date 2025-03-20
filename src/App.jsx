import { useState, useEffect } from 'react';
import { Route, Routes, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ProductList from './components/ProductList';
import Cart from './components/Cart';
import AddProduct from './components/AddProduct'; // Import AddProduct
import { Toaster } from 'react-hot-toast';
import { ShoppingCartIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

function App() {
  const [user, setUser] = useState(null);
  const [jwt, setJwt] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for existing authentication on initial load
    const storedUser = localStorage.getItem('user');
    const storedJwt = localStorage.getItem('jwt');

    if (storedUser && storedJwt) {
      setUser(JSON.parse(storedUser));
      setJwt(storedJwt);
    }
  }, []);

  

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    setUser(null);
    setJwt(null);
    navigate('/login');
  };

  //click logout button after 3 min automatically after login
  useEffect(() => {
    if(jwt){
    const logoutTimer = setTimeout(() => {
      handleLogout();
    }, 180000); // 3 minutes in milliseconds

    return () => {
      clearTimeout(logoutTimer);
    };}
  }, [jwt]);

    

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getAnimatedStyle = () => {
    return "absolute inset-0 bg-blue-500 opacity-25 rounded-md animate-pulse";
  };

  return (
    <div className="min-h-screen bg-gray-100 overflow-hidden">
      <Toaster position="top-center" reverseOrder={false} />
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {jwt && (
                <div className="flex space-x-4">
                  <div className="relative">
                    <Link
                      to="/ProductList"
                      className={`flex items-center text-blue-600 hover:text-blue-800 font-semibold transition duration-300 px-3 py-2 rounded-md ${isActive('/ProductList') ? 'text-blue-800' : ''}`}
                    >
                      <ShoppingBagIcon className="h-5 w-5 mr-1" />
                      Products
                    </Link>
                    {isActive('/ProductList') && <span className={getAnimatedStyle()} />}
                  </div>
                  <div className="relative">
                    <Link
                      to="/cart"
                      className={`flex items-center text-blue-600 hover:text-blue-800 font-semibold transition duration-300 px-3 py-2 rounded-md ${isActive('/cart') ? 'text-blue-800' : ''}`}
                    >
                      <ShoppingCartIcon className="h-5 w-5 mr-1" />
                      Cart
                    </Link>
                    {isActive('/cart') && <span className={getAnimatedStyle()} />}
                  </div>
                   
                </div>
              )}
            </div>
            <div className="flex items-center">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="hidden sm:block text-gray-700 font-medium">
                    Welcome, {user.username}!
                  </span>
                  <button
                    onClick={handleLogout}
                    className="cursor-pointer bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 flex items-center"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <Link
                    to="/login"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 flex items-center"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 flex items-center"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <p className="text-center text-gray-500 text-sm mt-4">
          &copy; {new Date().getFullYear()} Ecommerce App. All rights reserved.
        </p>
        <Routes>
          <Route path="/" element={<ProductList jwt={jwt} />} />
          <Route
            path="/ProductList"
            element={
              jwt ? (
                <ProductList jwt={jwt} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/cart"
            element={
              jwt ? (
                <Cart jwt={jwt} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/login"
            element={
              !jwt ? (
                <Login setUser={setUser} setJwt={setJwt} />
              ) : (
                <Navigate to="/ProductList" replace />
              )
            }
          />
          <Route
            path="/register"
            element={
              !jwt ? (
                <Register />
              ) : (
                <Navigate to="/ProductList" replace />
              )
            }
          />
           <Route
            path="/add-product"
            element={
              jwt ? (
                <AddProduct jwt={jwt}  /> // Pass JWT and user ID
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>

      </main>
    </div>
  );
}

export default App;
