import { ApolloClient, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";

const httpLink = createUploadLink({
  uri: '/api/graphql', // Point to our proxy endpoint
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
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only', // Don't use cache for queries
      nextFetchPolicy: 'network-only',
    },
    query: {
      fetchPolicy: 'network-only', // Don't use cache for queries
      nextFetchPolicy: 'network-only',
    },
  }
});

export default client;
