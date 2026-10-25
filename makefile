# Default goal
.DEFAULT_GOAL := help

# Paths (relative)
BACKEND_DIR   := ./backend
FRONTEND_DIR  := ./frontend
TEMPLATES_DIR := $(BACKEND_DIR)/bookflow/templates

PYTHON ?= .venv/bin/python
MANAGE := $(PYTHON) $(BACKEND_DIR)/manage.py

NPX_BIN := $(FRONTEND_DIR)/node_modules/.bin

# PHONY targets
.PHONY: help install install-backend install-frontend \
        dev run-backend run-frontend \
        migrations migrate superuser shell check test \
        frontend copy collect deploy restart clean

# Help (default)
help:
	@echo ""
	@echo "Setup:"
	@echo "  make install -------> Create .venv, install backend + frontend dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev -----------> Run Django and React together"
	@echo "  make run-backend ---> Migrate and run the Django dev server (:8000)"
	@echo "  make run-frontend --> Run React (:3000, proxies /api and /media to :8000)"
	@echo ""
	@echo "Database:"
	@echo "  make migrations ----> Make migrations for both apps"
	@echo "  make migrate -------> Apply migrations"
	@echo "  make superuser -----> Create an admin user"
	@echo "  make shell ---------> Django shell"
	@echo ""
	@echo "Checks:"
	@echo "  make check ---------> Django system check + tests"
	@echo "  make test ----------> Run Django tests"
	@echo ""
	@echo "Production:"
	@echo "  make deploy --------> Build frontend, copy files, collect static, restart services"
	@echo "  make frontend ------> Install & build frontend (React)"
	@echo "  make copy ----------> Copy frontend build into Django templates"
	@echo "  make collect -------> Django collectstatic"
	@echo "  make restart -------> Restart gunicorn + nginx"
	@echo ""
	@echo "  make clean ---------> Remove caches and build output"
	@echo ""

# Setup
install: install-backend install-frontend

install-backend:
	python3 -m venv .venv
	$(PYTHON) -m pip install -q --upgrade pip
	$(PYTHON) -m pip install -q -r $(BACKEND_DIR)/requirements.txt
	@[ -f $(BACKEND_DIR)/.env ] || cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env

install-frontend:
	cd $(FRONTEND_DIR) && npm install

# Development
dev:
	$(NPX_BIN)/concurrently --names backend,frontend \
		"$(MAKE) run-backend" \
		"$(MAKE) run-frontend"

run-backend: migrate
	$(MANAGE) runserver

# React compiles the SCSS itself (index.js imports styles.scss), so no watcher is needed.
run-frontend:
	cd $(FRONTEND_DIR) && npm start

# Database
migrations:
	$(MANAGE) makemigrations converter library

migrate:
	$(MANAGE) migrate

superuser:
	$(MANAGE) createsuperuser

shell:
	$(MANAGE) shell

# Checks
check:
	$(MANAGE) check
	$(MANAGE) makemigrations --check --dry-run
	$(MANAGE) test $(BACKEND_DIR)

test:
	$(MANAGE) test $(BACKEND_DIR)

# Production Deployment
deploy: frontend copy collect migrate restart
	@echo "Production deployment completed"

frontend:
	cd $(FRONTEND_DIR) && npm install
	cd $(FRONTEND_DIR) && npm run build

copy:
	cp $(FRONTEND_DIR)/build/index.html $(TEMPLATES_DIR)/index.html

collect:
	$(MANAGE) collectstatic --noinput

restart:
	sudo systemctl restart gunicorn
	sudo systemctl restart nginx

clean:
	rm -rf $(FRONTEND_DIR)/build $(BACKEND_DIR)/staticfiles
	find . -name __pycache__ -not -path "./.venv/*" -not -path "*/node_modules/*" -exec rm -rf {} +
