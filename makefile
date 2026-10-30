# Default goal
.DEFAULT_GOAL := help

# Paths (relative)
BACKEND_DIR   := ./backend
FRONTEND_DIR  := ./frontend
TEMPLATES_DIR := $(BACKEND_DIR)/bookflow/templates

PYTHON ?= .venv/bin/python
MANAGE := $(PYTHON) $(BACKEND_DIR)/manage.py

NPX_BIN := $(FRONTEND_DIR)/node_modules/.bin

# The conversion engine. backend/.env sets PDF2EPUB_SOURCE: a folder (installed
# editable, so changes there show up right away) or anything pip installs, such as a
# git tag. Without it, the pinned release is used.
-include $(BACKEND_DIR)/.env
PDF2EPUB_SOURCE ?= git+https://github.com/andriaberi/PDF2EPUB.git@v1.2026.1029.2

# PHONY targets
.PHONY: help install install-backend install-engine install-frontend \
        dev run-backend run-frontend \
        migrations migrate superuser shell cleanup review check test \
        frontend copy collect deploy restart clean

# Help (default)
help:
	@echo ""
	@echo "Setup:"
	@echo "  make install -------> Create .venv, install backend + frontend dependencies"
	@echo "  make install-engine > Install PDF2EPUB from PDF2EPUB_SOURCE in backend/.env"
	@echo ""
	@echo "Development:"
	@echo "  make dev -----------> Run Django and React together"
	@echo "  make run-backend ---> Migrate and run the Django dev server (:8000)"
	@echo "  make run-frontend --> Run React (:3000, proxies /api and /media to :8000)"
	@echo ""
	@echo "Database:"
	@echo "  make migrations ----> Make migrations for the apps"
	@echo "  make migrate -------> Apply migrations"
	@echo "  make superuser -----> Create an admin user"
	@echo "  make shell ---------> Django shell"
	@echo "  make cleanup -------> Delete conversions whose page was closed"
	@echo "  make review --------> Email what is waiting for review in the admin"
	@echo ""
	@echo "Checks:"
	@echo "  make check ---------> Django system check + tests"
	@echo "  make test ----------> Run Django tests"
	@echo ""
	@echo "Production:"
	@echo "  make deploy --------> Install, build frontend, copy files, collect static, restart services"
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
	$(MAKE) install-engine

install-engine:
	@# A folder's version comes from its git tags, which CI makes on GitHub, so fetch them first.
	@if [ -d "$(PDF2EPUB_SOURCE)" ]; then \
		git -C "$(PDF2EPUB_SOURCE)" fetch -q --tags || echo "Couldn't fetch PDF2EPUB's tags; its version may be out of date"; \
		$(PYTHON) -m pip install -q -e "$(PDF2EPUB_SOURCE)"; \
	else \
		$(PYTHON) -m pip install -q "$(PDF2EPUB_SOURCE)"; \
	fi
	@$(PYTHON) -c "import pdf2epub; print('PDF2EPUB', pdf2epub.__version__, 'from', pdf2epub.__file__)"

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
	$(MANAGE) makemigrations converter library contact

migrate:
	$(MANAGE) migrate

superuser:
	$(MANAGE) createsuperuser

shell:
	$(MANAGE) shell

cleanup:
	$(MANAGE) cleanup_conversions

review:
	$(MANAGE) remind_review

# Checks
check:
	$(MANAGE) check
	$(MANAGE) makemigrations --check --dry-run
	$(MANAGE) test $(BACKEND_DIR)

test:
	$(MANAGE) test $(BACKEND_DIR)

# Production Deployment
deploy: install-backend frontend copy collect migrate restart
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
