import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';
import { gql, useMutation } from '@apollo/client';

const ADD_PRODUCT_MUTATION = gql`
  mutation AddProduct(
    $name: String!
    $description: String!
    $price: Float!
    $image: String! # Expecting base64 string
  ) {
    createProduct(
      name: $name
      description: $description
      price: $price
      image: $image
    ) {
      id
      name
      description
      price
      image_url
    }
  }
`;

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
function AddProduct() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(''); // Base64 string
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState('');
  const navigate = useNavigate();
  const imageInputRef = useRef(null); // Ref to the image input

  const [createProduct] = useMutation(ADD_PRODUCT_MUTATION, {
    refetchQueries: [{ query: GET_PRODUCTS }],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // setError('');
    setLoading(true);

    if (!image) {
      // setError('Please select an image.');
      toast.error('Please select an image!', { duration: 3000 });
      setLoading(false);
      return;
    }

    try {
      const { data } = await createProduct({
        variables: {
          name,
          description,
          price: parseFloat(price),
          image,
        },
      });

      if (data && data.createProduct) {
        console.log('Product added successfully:', data.createProduct);
        toast.success('Product added successfully!', { duration: 3000 });
        navigate('/ProductList'); // Redirect to product list
      } else {
        // setError('Failed to add product');
        toast.error('Failed to add product!', { duration: 3000 });
      }
    } catch (err) {
      console.error('Error adding product:', err);
      // setError(err.message || 'Failed to connect to the server.');
      toast.error('Failed to connect to the server.', { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setImage(reader.result); // Base64 string
        setImagePreview(reader.result);
      };

      reader.readAsDataURL(file);
    } else {
      setImage('');
      setImagePreview('');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-xl space-y-6 -mt-30">
        <h2 className="text-3xl font-bold text-gray-900 text-center">Add Product</h2>
        {/* {error && <div className="text-red-500">{error}</div>} */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Name:</label>
            <input
              type="text"
              id="name"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Description:</label>
            <textarea
              id="description"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter product description"
              rows="3"
              required
            />
          </div>
          <div>
            <label htmlFor="price" className="block text-gray-700 text-sm font-bold mb-2">Price:</label>
            <input
              type="number"
              id="price"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter product price"
              step="0.01"
              required
            />
          </div>
          <div>
            <label htmlFor="image" className="block text-gray-700 text-sm font-bold mb-2">Image:</label>
            <input
              type="file"
              id="image"
              ref={imageInputRef} // Attach the ref
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              onChange={handleImageChange}
              accept="image/*"
              required
            />
            {imagePreview && (
              <img src={imagePreview} alt="Image Preview" className="mt-2 max-h-32" />
            )}
          </div>
          <button
            type="submit"
            className="cursor-pointer w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
            disabled={loading}
          >
            {loading ? <ClipLoader color="#fff" size={20} /> : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddProduct;
