'use strict';

const WebSocketServer = require('uws').Server;
const url = require('url');
const headBacklog = [];

var wss = new WebSocketServer({ 
  port: process.env.PORT,
  clientTracking: true,
  verifyClient: (info) => {
    
    if (info.origin === 'https://head.glitch.me') {
      let id = url.parse(info.req.url, true).query.id;
      
      if (id == 'undefined') {
        console.error(id);
        return false;
      }
      return true;
    }
    
    console.log('Reject ' + info.origin);
    
    return false;
  }
});

wss.on('connection', (ws) => {
  
  ws.id = url.parse(ws.upgradeReq.url, true).query.id;

  let on = [];
    
  wss.clients.forEach((client) => {
    on.push(client.id);
  });

  console.log('Now online:', on.join(','));

  if (ws.id == 'HEAD-SERVER' && headBacklog.length > 0) {
    
    var message;
    
    console.log(headBacklog);
    
    while ((message = headBacklog.pop()) != undefined) {
      
      sendToId('HEAD-SERVER', message);
    }
  }
  
  ws.on('message', (message) => {
    
    var message = JSON.parse(message);
    message.from = ws.id;
    
    if (message.to === '*') {
    
      broadcast(JSON.stringify(message));
    } else {
      sendToId(message.to, JSON.stringify(message));
    }

    console.log('received from ' + ws.id + ': ', message);
  });
  
  ws.on('error', (error) => {
    console.error(error, ws);
  });
  
  ws.on('close', (event) => {
    console.log('Connection ' + ws.id + ' closed', event);
    
    let left = [];
    
    wss.clients.forEach((client) => {
      left.push(client.id);
    });
    
    console.log('Left online:', left.join(','));
  });
});

wss.on('error', (error) => {
  console.error(error);
});

wss.on('listening', (event) => {
  console.log('we ae now listening');
});

function sendToId(id, message) {
  let found = false;
  
  wss.clients.forEach((client) => {
    if (client.id === id) {
      client.send(message);
      found = true;
    }
  });
  
  if (!found) {
    if (id == 'HEAD-SERVER') {
      console.error('SendToId ' + id + ' backlogged');
      console.log(message);
      
      headBacklog.push(message);
    } else {
      console.error('SendToId ' + id + ' not found');
    }
  }
}

function broadcast(message) {
  wss.clients.forEach((client) => {
    client.send(message);
  });
}
