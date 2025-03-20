import { ApolloClient, InMemoryCache} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";

const httpLink = createUploadLink({  // Use createUploadLink
  uri: 'http://ecommercetensae.infinityfreeapp.com/backend/graphql/graphql.php',
});

const authLink = setContext((operation, context) => {
  const token = localStorage.getItem('jwt');

  let headers = context.headers || {};

  const authHeaders = {
    ...headers,
    Authorization: token ? `Bearer ${token}` : "",
  };

  return {
    headers: authHeaders,
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

export default client;
