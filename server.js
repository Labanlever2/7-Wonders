const http = require('http');
const os = require('os');

const PORT = 3000;

// Store active rooms
const rooms = {};

// Generate random 4-digit code
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body);

            // CREATE ROOM
            if (url.pathname === '/api/create-room') {
                const roomCode = generateRoomCode();
                rooms[roomCode] = {
                    code: roomCode,
                    players: [
                        {
                            playerNumber: 1,
                            name: data.playerName,
                            joinedAt: Date.now()
                        }
                    ],
                    createdAt: Date.now(),
                    status: 'waiting'
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    roomCode: roomCode,
                    playerNumber: 1,
                    hostIP: getLocalIP(),
                    port: PORT
                }));
            }

            // JOIN ROOM
            else if (url.pathname === '/api/join-room') {
                const { roomCode, playerName } = data;
                const room = rooms[roomCode];

                if (!room) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Room not found' }));
                    return;
                }

                if (room.players.length >= 7) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Room is full' }));
                    return;
                }

                const playerNumber = room.players.length + 1;
                room.players.push({
                    playerNumber: playerNumber,
                    name: playerName,
                    joinedAt: Date.now()
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    roomCode: roomCode,
                    playerNumber: playerNumber,
                    players: room.players
                }));
            }

            // GET ROOM STATUS
            else if (url.pathname === '/api/room-status') {
                const { roomCode } = data;
                const room = rooms[roomCode];

                if (!room) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Room not found' }));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    roomCode: roomCode,
                    players: room.players,
                    status: room.status
                }));
            }

            // LEAVE ROOM
            else if (url.pathname === '/api/leave-room') {
                const { roomCode, playerNumber } = data;
                const room = rooms[roomCode];

                if (!room) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Room not found' }));
                    return;
                }

                room.players = room.players.filter(p => p.playerNumber !== playerNumber);

                if (room.players.length === 0) {
                    delete rooms[roomCode];
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            }

            else {
                res.writeHead(404);
                res.end();
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    const ip = getLocalIP();
    console.log(`\n🎮 7 Wonders LAN Server Started`);
    console.log(`📍 Local IP: ${ip}`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`\n✅ Server running at: http://${ip}:${PORT}`);
    console.log(`\n📝 Share this address with other players on your LAN\n`);
});
