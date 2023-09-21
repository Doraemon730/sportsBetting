const { Web3 } = require('web3');
const cron = require('node-cron')
const User = require('../models/User');
const { makeMainDeposit } = require('../controllers/transactionController');


// WebSocket connections map (to store connections for each user's wallet)
const cronWalletSchedule = '* * * * *';
let init = 0;
const userWallets = new Map();
// Function to establish a WebSocket connection for a user's wallet
// async function connectToEthereumNode(walletAddress) {
//   try {
//     var subscription = web3.eth.subscribe('pendingTransactions', {address: walletAddress}, function(error, result){
//         if (!error)
//             console.log(result);
//         console.log(error);
//     });

//     // .on("data", (transaction) => {
//     //     console.log(transaction);
//     // });
//     // unsubscribes the subscription
    
//     // Store the WebSocket connection in the map
//     userWebSocketConnections.set(walletAddress, subscription);
//     return subscription;
//   } catch (error) {
//     console.error('Subscription error:', error);
//     // Handle any error that occurs during subscription setup
//     return "Error establishing connection";
//   }
// }
const addUserWallet = async (walletAddress) => {
  try{
    userWallets.set(walletAddress, 0);
  } catch (error) {
    console.log(error.message);
  }
}
const getBalance = (walletAddress, callback) => {
  const infuraWebSocket = process.env.WSS_ETHEREUM_URL;
  const web3 = new Web3(new Web3.providers.WebsocketProvider(infuraWebSocket));

  web3.eth.getBalance(walletAddress, (error, balance) => {
    if (error) {
      callback(error, null);
      return;
    }
    
    callback(null, web3.utils.fromWei(balance, 'ether'));
  });
}

const initUsers = () => {
  init = 1;
  User.find({}).select('walletAddress').then( users => {
    for(let user of users){
      if(user.walletAddress)
        userWallets.set(user.walletAddress, 0);
    }      
    console.log(users);
  });
}
const checkWallets = () =>{
  userWallets.forEach((value, wallet) => {
    console.log(`${wallet} => ${value}`);
    
    getBalance(wallet, (error, balance) => {
      if (error) {
        console.log('Error in getting balance', error.message);
        return;
      }      
      console.log(balance);
      if (balance > value) {
        makeMainDeposit(wallet, balance);      
      }
    });    
  });
}
const cronWalletMonitor = () => {
  try {
  console.log(`Wallet job started at ${Date()}`);
  if(!init)
  {
    initUsers();
  }
  
  checkWallets();
} catch (error) {
  console.log(error);
}
}
module.exports = {
  addUserWallet  
};