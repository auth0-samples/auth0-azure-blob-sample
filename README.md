## Azure Blob Share Sample

This samples shows how you can use Auth0 and the near infinite scale of Azure Blob Storage to build a rich and secure client application without a traditional backend. This example is built entirely in HTML/JavaScript and runs in the browser while still providing secure, authenticated access to resources in Azure Blob Storage.

**Demo: <http://auth0.github.io/auth0-azure-blob-sample/>**

![](https://cloudup.com/cpVf72JC-_6+)

## How this works?

1. User logs in with Auth0 (any identity provider)
2. Auth0 returns a JSON Web Token to the browser
3. The browser calls Auth0 `/delegation` endpoint to validate the token and exchange it for an Azure Blob SAS token associated with the user's container. If the container doesn't exist it is created in the [rule](rule.js) that runs during the delegation request.

  ```js  
  auth0.getDelegationToken({
    id_token: current_id_token,
    scope: "openid",
    api_type: "azure_blob",
    containerName: id_hash + "my-container-name"
  }, function(err, delegationResult) {
    callback(delegationResult.azure_blob_sas);
  });
  ```

4. With the Azure Blob SAS Token you can now request to list the blobs in that container.

  ```js
  var url = 'https://blobshare.blob.core.windows.net/' + containerName +
    '?' + sasToken + '&restype=container&comp=list';
  $.ajax({
    url: url,
    type: "GET",
    success: function(data, status) {
      var model = convertResponseToModel(data);
      callback(null, model);
    },
    error: function(xhr, desc, err) {
      callback(err);
    }
  });

  ```

5. Finally, when you want to upload, download, or delete a blob you simply repeat the process over again by requests a SAS token for the particular blob through the delegation endpoint.


## FAQ

### How is this secure if it's all client side?

The key to note here is that we are only giving the user limited access to the blobs or containers that we choose (via the rule). The Azure Storage Access Key is only use by Auth0 and never sent to the client. Thus, the client is only scoped to call APIs we grant them access to via the shared access keys.

### Can I use more advanced permissions?

In this sample, we simply grant the user full access to a container that starts with their user id (hashed). However, we can easily build a more robust role-based access policy that allows more fine-grained control of permissions. See our [documentation on rules](https://auth0.com/docs/rules) for more info.

## Running it locally

You can use any web server to serve the files in this folder. Below is a quick option for using the node 'serve' module. However, you can use any server you like as long as it runs on port 3000.

Install `serve`

    npm install -g serve

Run it on port 3000

    serve -p 3000

And point your browser to <http://localhost:3000>

## Setup Your Own Storage Account

In order to use your own storage account with this sample you must configure the account to allow [cross domain requests](https://msdn.microsoft.com/en-us/library/azure/dn535601.aspx).

The included setup script will do this for you. You will need to set a few environment variables first as shown below.

On OSX:

~~~
export AZURE_STORAGE_ACCOUNT=my_storage_account
export AZURE_STORAGE_ACCESS_KEY=my_access_key
~~~

On Windows:

~~~
SET AZURE_STORAGE_ACCOUNT=my_storage_account
SET AZURE_STORAGE_ACCESS_KEY=my_access_key
~~~

Then run the following command:

~~~
node setup_blob
~~~

## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.

## Author

[Auth0](auth0.com)

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
