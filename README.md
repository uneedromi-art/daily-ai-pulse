# Daily AI Pulse

Reddit · Google Research · CIO(한국어) · Medium 등에서 AI 뉴스를 모아 한국어 요약으로 보여주는 일일 뉴스 보드.

## 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000

## 뉴스 수집

```bash
npm run fetch-news    # 수집만
npm run daily         # 수집 + Windows 알림
```

`.env.local`에 `GEMINI_API_KEY` 설정 시 자연스러운 한국어 요약.

## GitHub Pages 배포

저장소: `uneedromi-art/daily-ai-pulse`  
사이트: https://uneedromi-art.github.io/daily-ai-pulse/

자세한 설정: [docs/GITHUB_PAGES_SETUP.md](docs/GITHUB_PAGES_SETUP.md)

### 코드 푸시 (처음)

```bash
git init
git add .
git commit -m "Initial commit: Daily AI Pulse"
git branch -M main
git remote add origin https://github.com/uneedromi-art/daily-ai-pulse.git
git push -u origin main
```

이후 **Settings → Pages → Source: GitHub Actions** 확인.

Secrets: `GEMINI_API_KEY` (Actions)

## 프로젝트 구조

```
scripts/          # 매일 실행: fetch_news, daily_job, notify, translateKo
src/              # Next.js 앱
public/data/      # news.json (수집 결과)
devtools/         # 디버그·실험 스크립트 (배포 제외 아님, 참고용)
docs/             # 배포·설정 가이드
```

## Windows 매일 알림

```bash
npm run setup-daily-task
```

`.env.local`의 `SITE_URL`을 Pages 주소로 맞출 것.
