const fs = require('fs');
const http = require('http');

(async () => {
  // Create test files of different sizes
  const smallPath = 'small-test.txt';
  const largePath = 'large-test.txt';
  fs.writeFileSync(smallPath, 'a'.repeat(100 * 1024)); // 100KB
  fs.writeFileSync(largePath, 'a'.repeat(2 * 1024 * 1024)); // 2MB

  const server = http.createServer((req, res) => {
    const filePath = req.url === '/large' ? largePath : smallPath;
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Content-Length': stat.size
    });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(0, async () => {
    const { port } = server.address();
    const base = `http://localhost:${port}`;
    const limit = 1 * 1024 * 1024;

    for (const type of ['small', 'large']) {
      const res = await fetch(`${base}/${type}`, { method: 'HEAD' });
      const size = parseInt(res.headers.get('content-length'), 10);
      console.log(`${type} file size: ${size}`);
      if (size > limit) {
        console.log(' -> exceeds limit, show warning and download button');
      } else {
        console.log(' -> within limit, preview allowed');
      }
    }

    server.close(() => {
      fs.unlinkSync(smallPath);
      fs.unlinkSync(largePath);
    });
  });
})();
