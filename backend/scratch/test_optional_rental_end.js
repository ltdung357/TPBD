const http = require('http');

async function runTest() {
  // Login to get token
  const loginData = JSON.stringify({ identifier: 'admin', password: 'admin' });
  
  const req = http.request({
    hostname: 'localhost',
    port: 5050,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', async () => {
      const loginRes = JSON.parse(body);
      if (!loginRes.token) {
        console.error('Login failed:', body);
        return;
      }
      const token = loginRes.token;
      console.log('Login success token received.');

      // 1. Test POST /api/rentals without rental_end
      const postData = JSON.stringify({
        customer_name: 'Khách Hàng Test Không Chọn Ngày Trả',
        customer_phone: '0912345678',
        rental_start: new Date().toISOString().split('T')[0],
        rental_end: '', // Blank / optional return date
        notes: 'Test optional return date feature',
        items: [{ costume_id: 1, qty: 1 }]
      });

      const orderReq = http.request({
        hostname: 'localhost',
        port: 5050,
        path: '/api/rentals',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res2) => {
        let body2 = '';
        res2.on('data', chunk => body2 += chunk);
        res2.on('end', () => {
          console.log('POST /api/rentals status:', res2.statusCode);
          const createdOrder = JSON.parse(body2);
          console.log('Created order:', createdOrder);

          if (createdOrder.order && createdOrder.order.id) {
            const orderId = createdOrder.order.id;

            // 2. Test PUT /api/rentals/:id to update rental_end later
            const futureDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
            const updateData = JSON.stringify({
              rental_end: futureDate,
              notes: 'Cập nhật ngày trả đồ sau 3 ngày'
            });

            const updateReq = http.request({
              hostname: 'localhost',
              port: 5050,
              path: `/api/rentals/${orderId}`,
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(updateData)
              }
            }, (res3) => {
              let body3 = '';
              res3.on('data', chunk => body3 += chunk);
              res3.on('end', () => {
                console.log('PUT /api/rentals/:id status:', res3.statusCode);
                console.log('Updated order:', JSON.parse(body3));
              });
            });
            updateReq.write(updateData);
            updateReq.end();
          }
        });
      });
      orderReq.write(postData);
      orderReq.end();
    });
  });

  req.write(loginData);
  req.end();
}

runTest();
