# GitHub Pages 배포 가이드

## 저장소

- 조직/계정: **uneedromi-art**
- 저장소: **daily-ai-pulse**
- URL: **https://uneedromi-art.github.io/daily-ai-pulse/**

## 1. 코드 푸시

프로젝트 폴더에서:

```bash
git init
git add .
git commit -m "Initial commit: Daily AI Pulse"
git branch -M main
git remote add origin https://github.com/uneedromi-art/daily-ai-pulse.git
git push -u origin main
```

이미 remote가 있으면:

```bash
git remote set-url origin https://github.com/uneedromi-art/daily-ai-pulse.git
git push -u origin main
```

## 2. Pages 활성화

1. 저장소 → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**
3. `Deploy GitHub Pages` 워크플로 완료 후 위 URL 접속

## 3. Secrets

**Settings → Secrets and variables → Actions**

| Secret | 용도 |
|--------|------|
| `GEMINI_API_KEY` | 매일 뉴스 한국어 요약 |

## 4. 로컬 알림 URL

`.env.local`:

```env
SITE_URL=https://uneedromi-art.github.io/daily-ai-pulse
```

```bash
npm run setup-daily-task
```
