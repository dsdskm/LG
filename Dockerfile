# syntax=docker/dockerfile:1.6
###############################################################################
# Base (Node + pnpm 고정)
###############################################################################
ARG PNPM_VERSION=10.30.3
FROM node:24.14.0-slim AS base

# ✅ Debian slim 기반에서는 apt-get으로 최소 패키지만 설치합니다.
# - ca-certificates: TLS/https 통신 안정성
# - git: 일부 dependency가 git을 참조하는 경우 대비
# - curl: 빌드/헬스체크/진단에 유용
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    curl \
 && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# corepack + pnpm 버전 고정 (재현성)
RUN corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

###############################################################################
# deps (lockfile 기반으로 store 미리 채우기)
# - pnpm fetch는 package manifest(package.json) 무시하고 lockfile로만 store를 채워
#   Docker 빌드 최적화에 특화된 명령입니다. [1](https://pnpm.io/next/cli/fetch)
###############################################################################
FROM base AS deps

# pnpm fetch에 필요한 최소 파일들
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
# (있다면) .npmrc, .pnpmfile.cjs, patches 등도 함께 COPY 필요
# COPY .npmrc ./
# COPY .pnpmfile.cjs ./
# COPY patches ./patches

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
 && pnpm fetch

###############################################################################
# builder (실제 install + build)
# - 여기서 pnpm install을 반드시 수행해야 workspace별 node_modules가 생성되어
#   apps/ota, apps/robot에서 vite 실행이 보장됩니다.
###############################################################################
FROM base AS builder

# 빌드 환경 (CI에서 --build-arg DEPLOY_ENV=dev|qa|prod 로 전달됨)
ARG DEPLOY_ENV=qa
# 필요하면 빌드 중에도 참고 가능하도록 ENV로 노출(선택)
ENV DEPLOY_ENV=${DEPLOY_ENV}

# 소스 전체 복사 (workspace/node_modules는 .dockerignore로 제외되어야 함)
COPY . .

# deps 단계에서 채운 store를 같은 cache id로 재사용하여 빠르게 설치
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
 && pnpm install --frozen-lockfile

# 기존 빌드 결과 정리
RUN rm -rf apps-dist

# DEPLOY_ENV에 따라 빌드 스크립트 분기
# - dev  -> pnpm build:dev
# - qa   -> pnpm build:qa
# - prod -> pnpm build
RUN set -e; \
  echo "🏗️ Building all applications (DEPLOY_ENV=${DEPLOY_ENV})"; \
  case "${DEPLOY_ENV}" in \
    dev)  pnpm build:dev ;; \
    qa)   pnpm build:qa ;; \
    prod) pnpm build ;; \
    *)    echo "❌ Unsupported DEPLOY_ENV=${DEPLOY_ENV} (use dev|qa|prod)" && exit 1 ;; \
  esac

# ---- 빌드 산출물 검증 (중요) ----
RUN test -f apps-dist/index.html \
 || (echo "❌ main app index.html missing" && exit 1)
RUN test -f apps-dist/ota/index.html \
 || (echo "❌ ota app index.html missing" && exit 1)
RUN test -f apps-dist/robot/index.html \
 || (echo "❌ robot app index.html missing" && exit 1)
RUN test -f apps-dist/learning/index.html \
 || (echo "❌ learning app index.html missing" && exit 1)
RUN echo "✅ Build validation passed"

###############################################################################
# production (nginx, qa/prod 분리 conf 사용)
#
# ✅ 최적 권장
# - nginx:1.25-bookworm (glibc 기반)
# - Node 빌드 단계가 glibc(slim)이므로, 런타임도 glibc로 맞춰
#   운영 일관성과 디버깅/확장성을 확보합니다.
###############################################################################
FROM nginx:1.25-bookworm AS production

ARG DEPLOY_ENV=qa

# non-root user
# Debian 계열 adduser/addgroup 옵션
# - 시스템 계정/그룹으로 생성하여 권한 최소화
RUN addgroup --system --gid 1001 appgroup \
 && adduser  --system --uid 1001 --ingroup appgroup --no-create-home appuser

# Debian 계열 패키지 설치 (기존 apk -> apt-get)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tzdata \
 && rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
 && echo $TZ > /etc/timezone

# 환경별 nginx.conf 선택 (repo 루트에 nginx.qa.conf / nginx.prod.conf 배치)
COPY nginx.${DEPLOY_ENV}.conf /etc/nginx/nginx.conf

# 정적 산출물 배치
COPY --from=builder /app/apps-dist /usr/share/nginx/html

# 에러 페이지
RUN echo '<!DOCTYPE html><html><body><h1>404 - Not Found</h1></body></html>' \
 > /usr/share/nginx/html/404.html \
 && echo '<!DOCTYPE html><html><body><h1>500 - Server Error</h1></body></html>' \
 > /usr/share/nginx/html/50x.html

# 권한 정리 (non-root nginx)
RUN chown -R appuser:appgroup /usr/share/nginx/html \
 && chown -R appuser:appgroup /var/cache/nginx \
 && chown -R appuser:appgroup /var/log/nginx \
 && chown -R appuser:appgroup /etc/nginx \
 && touch /var/run/nginx.pid \
 && chown appuser:appgroup /var/run/nginx.pid

EXPOSE 80

# 정적 사이트 기준 healthcheck (nginx.conf의 /health와 별개로도 안전)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
 CMD test -f /usr/share/nginx/html/index.html || exit 1

USER appuser
CMD ["nginx", "-g", "daemon off;"]