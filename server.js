const jsonServer = require('json-server');
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const https = require('https');
const fs = require('fs');

const server = jsonServer.create();
const middlewares = jsonServer.defaults();

const routesReq = require(path.join(__dirname, 'routes.json'));
const routes = jsonServer.rewriter(routesReq);
let router = jsonServer.router(path.join(__dirname, 'db.json')); // Define router outside of middleware
const RESPONSE_DELAY = 500; // Delay in milliseconds (adjust as needed)

server.use(middlewares);
server.use(cookieParser());
server.use(jsonServer.bodyParser);

server.use((req, res, next) => {
  req.db = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));
  router.db.__wrapped__ = req.db; // Reset router's db
  next();
});

server.post('/api/Account/login', (req, res) => {
  console.log(req.originalUrl);
  
  const { PhoneNumber, password } = req.body;
  const users = req.db.login;
  const user = users.find(user => removeNonNumericCharacters(user.phoneNumber) === PhoneNumber);
  if(user){
    res.cookie('auth', 'YOUR_SECRET_TOKEN', { maxAge: 2592000000, httpOnly: true });
    res.cookie('BrowserCookie', 'YOUR_SECRET_TOKEN', { maxAge: 2592000000, httpOnly: true });
    res.json(user);
  } else {
    res.sendStatus(401);
  }
});

removeNonNumericCharacters = (input) => {
  const numericCharacters = input.replace(/[^\p{N}\p{Nd}]/gu, '');
  return numericCharacters;
}

server.get('/api/DownloadFile', (req, res) => {
  const fileName = "test.pdf";
  const file = `${__dirname}/assets/${fileName}`; 
  fs.readFile(file, (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send(err);
    } else {
      res.setHeader('Content-Length', data.length);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.write(data);
      res.end();
    }
  });
});

server.use((req, res, next) => {
  setTimeout(() => {
  
  const noAuthRoutes = [""];
  const throwErrorRoutes = ["/api/route"];
  console.log(req.originalUrl);
  if(throwErrorRoutes.includes(req.originalUrl)){
    const statusToSend = 403;
    console.log("THROWING ERROR");
    res.sendStatus(statusToSend);
  }
  else if (req.cookies.BrowserCookie|| noAuthRoutes.includes(req.originalUrl))  {
    if (req.method === 'POST') {
      req.method = 'GET'
      req.query = req.body
    }
    
    next();
  } else {
    res.sendStatus(401);
  }}, RESPONSE_DELAY);
});

server.use('/api', routes, router);
let port = 44387;
https.createServer({
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./certificate.pem')
}, server).listen(port, () => {
  console.log(`JSON Server is running on https://localhost:${port}`);
});
