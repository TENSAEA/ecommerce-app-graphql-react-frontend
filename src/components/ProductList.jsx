import { useQuery, gql } from "@apollo/client";
import propTypes from "prop-types";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";

const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      description
      price
      image_url
    }
  }
`;

function ProductList({ jwt }) {
  const { loading, error, data } = useQuery(GET_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  const handleAddToCart = async (product) => {
    try {
      const response = await fetch(
        "https://ecommercetensae.infinityfreeapp.com/backend/add_to_cart.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ productId: product.id }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log(data.message);
        toast.success(`${product.name} added to cart!`, { duration: 2000 }); // Optional: Provide feedback to the user
      } else {
        console.error("Add to cart failed:", data.message);
        toast.error(`Failed to add ${product.name} to cart: ${data.message}`, {
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(`Failed to add ${product.name} to cart: ${error}`, {
        duration: 2000,
      });
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (data && data.products) {
      const filtered = data.products.filter(
        (product) =>
          product.name.toLowerCase().includes(term.toLowerCase()) ||
          product.description.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const productsToDisplay = searchTerm
    ? filteredProducts
    : data
    ? data.products
    : [];

  if (loading)
    return <p className="text-center text-gray-600">Loading products…</p>;
  if (error)
    return <p className="text-center text-red-500">Error: {error.message}</p>;

  return (
    <div className="container mx-auto mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-semibold text-gray-800">Products</h2>
      </div>

      {/* Search Input and Add Product Button */}
      <div className="mb-4 flex items-center space-x-2">
        <input
          type="text"
          placeholder="Search products..."
          className="w-3/4 px-4 py-2 bg-white rounded-full shadow-md focus:ring-blue-200 focus:outline-none transition-shadow duration-300 placeholder-gray-400 text-gray-700"
          value={searchTerm}
          onChange={handleSearch}
        />
        <Link
          to="/add-product"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded-full focus:outline-none focus:shadow-outline transition duration-300 flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-1 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-base">Add Product</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productsToDisplay.map((product) => (
          <div
            key={product.id}
            className="relative bg-white shadow-md rounded-md overflow-hidden transform transition-transform hover:scale-105 duration-300"
          >
            <div className="relative">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-64 object-cover rounded-t-md"
              />
              <div className="absolute inset-0 bg-black opacity-0 hover:opacity-40 transition-opacity duration-300"></div>
            </div>
            <div className="p-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {product.name}
              </h3>
              <p className="text-gray-600 mb-2">{product.description}</p>
              <p className="text-lg font-bold text-blue-600">
                ${product.price}
              </p>
              <button
                className=" cursor-pointer w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 flex items-center"
                onClick={() => handleAddToCart(product)}
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductList;

ProductList.propTypes = {
  jwt: propTypes.string,
};
