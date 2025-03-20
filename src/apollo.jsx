import { ApolloClient, InMemoryCache, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";

const httpLink = createUploadLink({
  uri: '/api/graphql',
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

// Add error handling
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      nextFetchPolicy: 'network-only',
    },
    query: {
      fetchPolicy: 'network-only',
      nextFetchPolicy: 'network-only',
    },
  }
});

export default client;
