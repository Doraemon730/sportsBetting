
exports.placeBetById = (req, res) => {
    const { id } = req.params; // Extract the ID from the request parameters
    const { userId, amount, team } = req.body; // Extract other data from the request body
    

    const bet = {
      id,
      userId,
      amount,
      team,
    };    
   
    
    res.status(201).json({ message: 'Bet placed successfully', bet });
  };
  
  // Get a bet by a specific ID
  exports.getBetById = (req, res) => {
    const { id } = req.params; // Extract the ID from the request parameters
    
    // Use the 'id' parameter to fetch the specific bet
    
    // Example logic (for demonstration purposes)
    const bet = {
      id,
      userId: 'user123',
      amount: 100,
      team: 'Team A',
    };
    
    res.json({ bet });
  };
  