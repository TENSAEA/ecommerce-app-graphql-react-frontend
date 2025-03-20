import { useState, useEffect } from 'react';
import propTypes from 'prop-types';

function Cart() {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCartItems = async () => {
            setLoading(true);
            setError(null);
            try {
                // Retrieve JWT from localStorage (or wherever you store it)
                const storedJwt = localStorage.getItem('jwt'); // Or use cookie retrieval

                if (!storedJwt) {
                    setError('No token found. Please log in.');
                    setLoading(false);
                    return; // Stop the fetch if no token
                }

                const response = await fetch('https://ecommercetensae.infinityfreeapp.com/backend/get_cart_items.php', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${storedJwt}`
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setCartItems(data);
            } catch (error) {
                console.error('Error fetching cart items:', error);
                setError(error.message || 'Failed to load cart items.');
            } finally {
                setLoading(false);
            }
        };

        fetchCartItems();
    }, []); // Removed jwt from dependency array.  It should be fetched from local storage

    const handleRemoveFromCart = async (productId) => {
        try {
            const storedJwt = localStorage.getItem('jwt'); // Get JWT for each request
             if (!storedJwt) {
                    setError('No token found. Please log in.');
                    return; // Stop the fetch if no token
                }
            const response = await fetch('http://localhost/ecommerce-app/backend/remove_from_cart.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${storedJwt}`
                },
                body: JSON.stringify({ productId: productId }) // Send product ID to remove
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (response.ok) {
                // Update the component to display the new Quantity
                setCartItems(cartItems.filter((item) => item.product_id !== productId));
            }

            console.log(data.message);
            // After successful removal, update the cart items state
            setCartItems(prevItems => prevItems.filter(item => item.product_id !== productId));

        } catch (error) {
            console.error('Error removing from cart:', error);
        }
    };

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
    };

    if (loading) {
        return <p>Loading cart...</p>;
    }

    if (error) {
        return <p>Error: {error}</p>;
    }

    if (cartItems.length === 0) {
        return <p className="text-gray-600">Your cart is empty.</p>;
    }

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">Cart</h2>
            <ul>
                {cartItems.map((item) => (
                    <li key={item.product_id} className="flex items-center justify-between py-2 border-b border-gray-200">
                        <div className="flex items-center">
                            <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-md mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold">{item.name}</h3>
                                <p className="text-gray-700">Quantity: {item.quantity}</p>
                                <p className="text-gray-700">${item.price}</p>
                            </div>
                        </div>
                        <button
                            className="cursor-pointer bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            onClick={() => handleRemoveFromCart(item.product_id)}
                        >
                            Remove
                        </button>
                    </li>
                ))}
            </ul>
            <div className="mt-4">
                <p className="text-xl font-bold">
                    Total: ${calculateTotal()}
                </p>
                <button
                    className="cursor-pointer bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => alert('Checkout feature will be avaliable soon!')}
                >
                    Checkout
                </button>
            </div>
        </div>
    );
}

export default Cart;

Cart.propTypes = {
    jwt: propTypes.string, // jwt is no longer required
};
