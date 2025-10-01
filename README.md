# Colyseus MMO Server

This is a basic setup for a Colyseus cluster MMO server.

## Installation

1. Ensure you have Node.js and npm installed.
2. Install dependencies: `npm install`

## Running the Server

`npm start`

The server will start on port 2567.

## Development

- Rooms are defined in the `rooms/` directory.
- For clustering, you may need to run multiple instances and configure Redis for pub/sub.

## Notes

- This is a starting point. Customize the room logic in `rooms/MyRoom.js` for your MMO game.
- For production clustering, refer to Colyseus documentation on scaling.