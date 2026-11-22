# Production deployment в Yandex Cloud

Frontend собирается как статический Vite bundle и запускается в Nginx-контейнере
на `127.0.0.1:8080` production VM. Внешний Nginx отдаёт frontend с `/`, а `/api/`,
`/docs`, `/redoc` и `/openapi.json` направляет в UBAS Backend на
`127.0.0.1:8000`.

Production build не задаёт `VITE_API_URL`: клиент использует `/api/v1` текущего
origin. Адрес VM не встраивается в JavaScript, CORS между frontend и backend не
требуется.

## Автоматическое обновление

Workflow `.github/workflows/ci.yml` автоматически выполняет lint, Prettier,
Vitest и production build для PR и изменений `master`. Deployment запускается
только вручную кнопкой **Run workflow** с выбранной веткой `master`. После
повторных проверок job получает короткоживущий Yandex Cloud IAM token через
GitHub OIDC и публикует `ubas-frontend:<git-sha>` и `ubas-frontend:master` в
существующий Cloud Registry.

На VM `ubas-frontend-deploy.timer` раз в минуту проверяет `master`. Pull выполняет
прикреплённый к VM service account. Compose фиксирует immutable digest, запускает
контейнер и только после healthcheck обновляет `/opt/ubas-frontend/current-release`.
GitHub проверяет этот SHA через `/__frontend_version`.

Слияние PR само по себе не меняет production. Для выкладки откройте в GitHub
**Actions → Quality checks and manual production deploy → Run workflow**,
выберите `master` и подтвердите запуск.

Постоянные ключи и GitHub secrets не используются. OIDC credential ограничен
production environment конкретного frontend-репозитория. В Yandex Cloud создана
привязка `ajea0b1phfgk1q8eckkg` с subject
`repo:UBAS-KurganDev@334516411/frontend@1390774361:environment:production`.

## Первичная установка на VM

VM должна уже содержать Docker, Compose, jq, Nginx, пользователя `ubas` в группе
`docker` и backend deployment в `/opt/ubas`. Из checkout frontend выполните:

```shell
sudo bash scripts/install-production-vm.sh
```

Скрипт устанавливает frontend systemd timer и общую конфигурацию host Nginx.
Он идемпотентен. Перед применением выполняется `nginx -t`; backend API и Swagger
сохраняют прежние URL.

## Локальный Docker

```shell
cp .env.example .env
docker compose up --build -d
```

Локальный образ собирается с `VITE_API_URL=http://127.0.0.1:8000` и доступен на
`http://127.0.0.1:8080`. Для production same-origin сборки передайте пустое
значение: `VITE_API_URL= docker compose build`.
