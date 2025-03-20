import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // setError('');
    setLoading(true);

    // Simulate a delay to show the spinner
    setTimeout(async () => {
      try {
        const response = await fetch('https://ecommercetensae.infinityfreeapp.com/backend/register.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          // Registration successful
          console.log('Registration successful:', data);
          toast.success('Registration Successful!', { duration: 3000 });
          navigate('/login'); // Redirect to the login page after registration
        } else {
          // Registration failed
          // setError(data.message || 'Registration failed');
          toast.error(data.message || 'Registration Failed!', { duration: 3000 });
        }
      } catch (err) {
        console.error('Registration error:', err);
        // setError('Failed to connect to the server.');
        toast.error('Failed to connect to the server.', { duration: 3000 });
      } finally {
        setLoading(false);
      }
    }, 1500); // Delay of 1.5 seconds
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-xl space-y-6 mt-[-30px]">
        <h2 className="text-3xl font-bold text-gray-900 text-center">Register</h2>
        {/* {error && <div className="text-red-500">{error}</div>} */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">Username:</label>
            <input
              type="text"
              id="username"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Password:</label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
            disabled={loading}
          >
            {loading ? <ClipLoader color="#fff" size={20} /> : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
