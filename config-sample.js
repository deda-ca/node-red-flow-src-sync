export const config = {
    /**
     * The base URL to Node-Red. If there is a port, include it within the URL.
     */
    nodeRedUrl: 'https://node-red.mydomain.lan',

    /**
     * Allow self-signed certificates. This is required if you are using self-signed certificates to access Node-Red.
     */
    allowSelfSignedCertificates: true,

    /**
     * If no authentication is enabled within Node-Red, set this to null.
     * If authentication is enabled within Node-Red the bearer token can be provided here.
     * The token can be found within the root folder of Node-Red within the `.sessions` files.
     */
    bearerToken: null,

    /**
     * The full path where to output the source files.
     * It can be on your local machine and does not need to be located within the node-red folder.
     * The source folder is rebuilt from the latest node-red flows files.
     */
    sourcePath: '~/Projects/iot-node-red-src'
};
