window.config = {
  domain:         'ntotten-auth0.auth0.com', // Auth0 domain
  clientId:       '7TNKInU588NKxmt6CTccM6iuh3V2Zi70', // Auth0 app client id
  role:           'arn:aws:iam::010616021751:role/access-to-s3-per-user',  // AWS role arn
  principal:      'arn:aws:iam::010616021751:saml-provider/auth0-provider', // AWS saml provider arn
  targetClientId: 'jAbmUzhI7KZ5cWG8gsyT3IaTg0dS9KZV' // Auth0 AWS API client id
};
