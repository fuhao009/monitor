# monitor-console

Single-page monitoring admin console based on `demo.html`.

## Stack

- Frontend: React + TypeScript + Vite + Ant Design + Pro Components
- Backend: Go 1.24 + standard library

## Run

### Backend

```bash
cd backend
go run ./cmd/server
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api` to `http://localhost:8080`.

## Verify

- `cd backend && go test ./...`
- `cd backend && go build ./...`
- `cd frontend && npm run build`
