# План реворка блога Iconicompany

Цель: убрать «воду», добавить экспертизу, переопубликовать. Аудит 113 RU-постов:
**45 KEEP · 46 REWORK · 22 DROP**. Источник правды — RU; EN — перевод.

## Как работаем

- **По одному посту в день.**
- Цикл на пост:
  1. реворк в ТОМ ЖЕ файле (тот же URL, дату в frontmatter поднять на текущую);
  2. `git add … && git commit && git push`;
  3. `bun scripts/sync-content.ts` (→ iconicompany.com; **не** `content-sync.ts`);
  4. проверить `https://iconicompany.com/ru/blog/<slug>` по уникальному маркеру;
  5. анонс в канал через скилл `publish-post` (живой голос + картинка Gemini 3);
  6. через несколько дней записать охват LinkedIn в таблицу ниже.
- **Фактура (числа, кейсы)** — только реальная: из KEEP-постов или из исследований
  `/home/slavb18/work/iconicdocs/HANDOFF.md` (провенанс deep-tech). Не выдумывать.
- **Голос** — по скиллу `publish-post`: боль читателя (CTO/HR) — сюжет, технология — доказательство.
- **Визуал** — `viz:generate-image` (Gemini 3) / `viz:diagram`; картинка поста → `assets/blog/<slug>.png`.

## Прогресс и охваты

| # | Пост | Реворк | Анонс | Охват LinkedIn | Заметки |
|---|---|---|---|---|---|
| 1 | outstaffing-model-is-broken | 2026-07-18 ✅ | 2026-07-18 ✅ | _замер 2026-07-19_ | пилот; 4 слоя ставки + «стоимость денег», картинка Gemini. LinkedIn: ugcPost 7484199454087155712; TG t.me/iconicompany/674 |
| 2 | how-to-find-ai-native-developer | 2026-07-19 ✅ | 2026-07-19 ✅ | _замер 2026-07-20_ | claimed vs demonstrated + механика платформы; карусель сохранена, анонс с Gemini v1. LinkedIn: ugcPost 7484455648366354432; TG t.me/iconicompany/675 |
| 3 | model-knows-if-code-will-work-before-writing (НОВЫЙ, RU+EN) | 2026-07-20 ✅ | 2026-07-20 ✅ | _замер 2026-07-21_ | новый deep-tech по arxiv 2607.05188 (latent programming horizon), наш угол про латентную оценку; обложка Gemini v2. LinkedIn: ugcPost 7484816588509065216; TG t.me/iconicompany/676 |

## Бэклог REWORK

### Tier A — первыми (важная тема × много воды × есть чем добить экспертизу)
1. ~~outstaffing-model-is-broken~~ ✅ (пилот)
2. ~~how-to-find-ai-native-developer~~ ✅ — claimed vs demonstrated + реальная механика платформы (2026-07-19)
3. **new-sdlc-agentic-development** — раскрыть свой `/create-a-project`: скаффолд, агенты, код
4. **ai-is-consulting-and-why-your-hiring-is-broken** — сильный тезис (forward-deployed/Palantir) + нужны кейсы/цифры
5. **ai-native-development-2026-jira-resumes-breaking** — реальные инструменты названы, но не раскрыты (макс. апсайд)
6. **semantic-candidate-search** — есть техбаза (skills-extraction, CALM, cross-encoders) → сделать плотно
7. **team-as-a-system** — вытащить реальный стек (Temporal/authentik/werf/k8s) из-под хайпа

### Tier B — вторая волна
custom-development-industry-collapsing · hr-copilot-vs-autonomous-integrator · most-expensive-it-mistake-hiring-system-fate · why-it-hiring-broken-fix-behavioral-signals · you-dont-search-you-guess-why-modern-hiring-is-a-broken-algorithm · coding-new-literacy-era-of-just-developers-ends · the-demise-of-the-ordinary-senior-developer-ai-impact · github-for-ideas-and-ai-native-teams · why-1000-applications-is-a-problem · saas-recruitment-stuck-2005

### Tier C — остальные REWORK (мелкие/нишевые, по остаточному принципу)
analog-developers-2026 · ai-agent-self-evolution · ai-skills-blueprints-systems · ai-experience-job-market · ai-resume-pipeline-balance · apply-jobs-not-100-percent-match · fractional-cto · developer-evaluation-voice-screening · five-candidates-per-day-normalization · digital-twins-ai-net · end-of-vibe-coding-era-prompt-engineering-dead-loop-engineering · evolution-ai-sdlc-vibe-coding-spec-driven-break-scale-future · classic-outstaffing-2026-expensive-mistake-pig-in-a-poke · confident-server-syndrome-tech-hiring-gamble · product-engineer-market-demand · stop-rejecting-candidates-outstaffing · why-it-projects-fail-beyond-hard-skills-and-frameworks · specialist-visibility-ai-matching · stop-interviewing-for-memorization · resume-adaptation-screening-updates · why-do-we-need-ai-agents · people-ai-agents-robots-future-of-work · inhouse-it-control-illusion · hiring-expensive-bug-b2b-trial · job-search-broken-algorithms-2026 · it-specialist-as-partner · job-search-2026-second-fulltime-job · outstaffing-aggregator-vacancies-find-you · oh-my-bench

## Дубли — схлопнуть (не переписывать каждый)

- **«Кто такой AI-native разработчик / конец просто-разработчиков»** (7): оставить 1 манифест + how-to-find-ai-native (найм); остальные → DROP/редирект.
- **«Найм — сломанный алгоритм»** (6): ядро уже в KEEP `the-most-expensive-it-mistake-is-your-interview`; оставить 1 сильный REWORK (behavioral-signals).
- **Fractional CTO** (3): KEEP `it-architect-30-load` + 1; лендинг `fractional-cto-engineering-team-as-a-service` → DROP.
- **AI Insights в найме**: how-to-find-ai-native + offer-ai-insights (прямой дубль) → слить.
- **Job-search career**: job-search-2026-second-fulltime + job-search-broken-algorithms → слить.
- **Auth для AI-агентов**: KEEP you-dont-exist + web-services-blind — свести пересечения.

## DROP — 22 (отложено; решение пользователя — «пока оставить»)

ai-native-developer-new-era-product-development · ai-native-product-engineer-new-class-not-just-another-developer · ai-not-about-prompts · business-needs-team-not-developer · developer-project-resume-ai-agent · end-of-boxed-hr-solutions · fot-result-vs-idle-cost · fractional-cto-engineering-team-as-a-service · free-llm-courses-2026 · hiring-quest · manage-process-not-people · offer-ai-insights · neural-university-cooperation · typical-ai-founder-weekend-2026 · the-era-of-just-developers-is-over-who-are-we-looking-for-in-2026 · saas-transition-from-craft-to-architecture · total-digitalization-outstaffing-pipeline · specialist-is-result-test-drive · sprint-planning-quest-stop-method · recruiter-filters-hiring-problem · practical-it-training · two-years-anniversary

## KEEP — 45 (не трогаем)

Ядро: deep-tech/ML (skills-extraction, ConceptLM, latent-debate, CALM, cross-encoders, compress-tokens,
simvq, temporal-orchestration, harness-engineering) + лонгриды с first-party данными (developer-roles-demand
487 заявок, outstaffing-roles-demand 408, brain-sharing-economy, the-most-expensive-it-mistake-is-your-interview).
Полный триаж — в истории аудита сессии.
