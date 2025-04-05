const http = require('http');
const fs = require('fs');
const path = require('path');
const port = 3000;

const dict = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    fs.readFile('html5up-massively/index.html', function(err, data) {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(data);
    });
  } else {
    fs.readFile(path.join('html5up-massively', req.url), function(err, data) {
      console.log(path.extname(req.url) + "data data data");
      res.writeHead(200, {'Content-Type': dict[path.extname(req.url)]});
      res.end(data);
    });
  }
});

server.listen(port, () => {
  console.log("Server is running at http://localhost:${port}");
});