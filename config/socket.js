// config/socket.js — Socket.io real-time setup
let io;

module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: { origin: '*' }
    });

    io.on('connection', (socket) => {
      // User joins their personal room to receive order status updates
      socket.on('join_user_room', (userId) => {
        socket.join(`user_${userId}`);
      });

      // Admin joins their stall room to receive new order alerts
      socket.on('join_stall_room', (stallId) => {
        socket.join(`stall_${stallId}`);
      });

      socket.on('disconnect', () => {});
    });

    console.log('✅ Socket.io initialized');
    return io;
  },

  getIO: () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
  },

  // Emit new order to stall admin panel
  notifyAdmin: (stallId, orderData) => {
    if (!io) return;
    io.to(`stall_${stallId}`).emit('new_order', orderData);
  },

  // Emit order status update to user
  notifyUser: (userId, updateData) => {
    if (!io) return;
    io.to(`user_${userId}`).emit('order_update', updateData);
  },
};