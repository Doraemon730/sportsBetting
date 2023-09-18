const { Web3 } = require('web3');
const infuraWebSocket = process.env.WSS_ETHEREUM_URL;
// WebSocket connections map (to store connections for each user's wallet)
const userWebSocketConnections = new Map();
const web3 = new Web3(new Web3.providers.WebsocketProvider(infuraWebSocket));
// Function to establish a WebSocket connection for a user's wallet
async function connectToEthereumNode(walletAddress) {
  try {
    var subscription = await web3.eth.subscribe('pendingTransactions', {address: walletAddress}, function(error, result){
        if (!error)
            console.log(result);
        console.log(error);
    });

    // .on("data", (transaction) => {
    //     console.log(transaction);
    // });
    // unsubscribes the subscription
    
    // Store the WebSocket connection in the map
    userWebSocketConnections.set(walletAddress, subscription);
    return subscription;
  } catch (error) {
    console.error('Subscription error:', error);
    // Handle any error that occurs during subscription setup
    return "Error establishing connection";
  }
}

module.exports = {
  connectToEthereumNode,
  userWebSocketConnections,
};