# Convenience targets (see README.md for the full guide)

.PHONY: infra backend web build test

infra:            ## Start MySQL + Redis
	docker compose up -d mysql redis

app:              ## Start everything including the API container
	docker compose --profile app up -d --build

backend-install:  ## Install backend deps + generate Prisma client
	cd backend && npm install && npx prisma generate

migrate:          ## Run dev migrations
	cd backend && npm run prisma:migrate

seed:             ## Demo data (admin/seller/catalog)
	cd backend && npm run prisma:seed

backend:          ## Dev-run backend (watch)
	cd backend && npm run start:dev

web:              ## Dev-run web storefront
	cd web && npm run dev

build:            ## Typecheck/compile backend + web
	cd backend && npm run build
	cd web && npm run build

test:             ## Backend unit + smoke tests
	cd backend && npm test && npm run test:e2e
