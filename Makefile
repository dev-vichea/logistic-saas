SHELL := /bin/sh
.PHONY: setup up down test lint demo
setup:
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f frontend/.env.local || cp frontend/.env.example frontend/.env.local
	docker compose build
	docker compose run --rm app sh -c 'if ! grep -q "^APP_KEY=base64:" .env; then php artisan key:generate; fi'
	docker compose run --rm app php artisan migrate --force
	docker compose up -d
up:
	docker compose up -d

down:
	docker compose down

test:
	docker compose exec -e DB_DATABASE=logistics_test -e DB_HOST=postgres -e DB_USERNAME=logistics -e DB_PASSWORD=logistics app php artisan test --compact
	docker compose exec frontend npm run lint
	docker compose exec frontend npm run typecheck
	docker compose exec frontend npm run build
lint:
	docker compose exec app vendor/bin/pint --format agent
	docker compose exec frontend npm run lint

demo:
	docker compose exec app php artisan db:seed --class=DemoSeeder --no-interaction
