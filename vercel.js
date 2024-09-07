{
  "builds": [
    { "src": "api/server.js", "use": "@vercel/node" },
    { "src": "client/package.json", "use": "@vercel/static-build", "config": { "distDir": "client/dist" } }
  ],
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/server.js" },
    { "source": "/(.*)", "destination": "/client/index.html" }
  ]
}