const jwt = require('jsonwebtoken');


//Function to check if the user is authenticated using the JWT token.
//Use for routes that need user.
exports.verifyJWT = (req, res, next) =>{
  
  //Get token from header["x-access-token"].
  const token = req.headers["x-access-token"]

  if(!token){
    //If no token, send error 403. 
    res.status(403).send("Don't have token")
  }else{
    //If have token, decrypt it and store in req.user for later use. 
    jwt.verify(token, "jwtSecret",async function(err, decoded) {
        if (err) {
          res.status(401).json({ error: err.message });
        }else{
            req.user = decoded;
            next();
        }
    })
  }

}
