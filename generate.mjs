// generate.mjs
// 毎日1回 GitHub Actions から実行され、最新ニュースを取得して
// CEFRレベル別の学習レッスンを作り、data/lessons.json に書き出します。
// 依存パッケージなし（Node 20+ のグローバル fetch を使用）。
//
// 必要な環境変数（GitHub Secrets から渡す）:
//   GUARDIAN_API_KEY  ... https://open-platform.theguardian.com/ で無料取得
//   ANTHROPIC_API_KEY ... Claude API キー

import { writeFile, mkdir } from "node:fs/promises";

const GUARDIAN_KEY = process.env.GUARDIAN_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!GUARDIAN_KEY || !ANTHROPIC_KEY) {
  console.error("GUARDIAN_API_KEY と ANTHROPIC_API_KEY を設定してください。");
  process.exit(1);
}

// レベルごとに何記事ぶん作るか（「別の記事で続ける」用のストック）
const PER_LEVEL = 3;
const LEVELS = ["A2", "B1", "B2", "C1", "C2"];

// Guardian のセクション → アプリのトピックID
const SECTIONS = [
  { section: "world", topic: "world" },
  { section: "technology", topic: "technology" },
  { section: "science", topic: "science" },
  { section: "business", topic: "business" },
  { section: "culture", topic: "culture" },
];

// ---- 1. Guardian から最新記事のプールを取得 ----------------------------
async function fetchArticles() {
  const pool = [];
  for (const { section, topic } of SECTIONS) {
    const url =
      `https://content.guardianapis.com/search?section=${section}` +
      `&order-by=newest&page-size=4&show-fields=bodyText,trailText` +
      `&api-key=${GUARDIAN_KEY}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      for (const r of data?.response?.results || []) {
        const body = (r.fields?.bodyText || "").trim();
        if (body.length < 300) continue; // 短すぎる記事は除外
        pool.push({
          topic,
          headline: r.webTitle,
          url: r.webUrl,
          when: new Date(r.webPublicationDate).toISOString().slice(0, 10),
          bodyText: body.slice(0, 1600), // トークン節約のため先頭だけ
        });
      }
    } catch (e) {
      console.warn(`Guardian ${section} 取得失敗:`, e.message);
    }
  }
  return pool;
}

// ---- 2. Claude で1記事を1レベルぶんのレッスンに加工 --------------------
async function makeLesson(article, level) {
  // CEFR ごとの厳密な難易度ガイド（語彙・文長・文法を統制し、レベルを逸脱させない）
  const LEVEL_RULES = {
    A2: "Use only high-frequency everyday words. Sentences max ~10 words. Present/past simple only; no relative clauses, no passive, no perfect tenses.",
    B1: "Use common vocabulary. Sentences max ~16 words. Allow present perfect, simple relatives and modals; avoid rare idioms and complex subordination.",
    B2: "Use a broader range including some abstract vocabulary. Sentences max ~22 words. Allow passive, conditionals and varied subordination; keep it readable.",
    C1: "Use precise, sophisticated vocabulary and varied complex structures, mirroring quality journalism. Do not artificially simplify.",
    C2: "Use highly sophisticated, idiomatic and abstract language typical of opinion essays and literary journalism, with complex, varied syntax. Do not simplify at all; assume a near-native reader.",
  };
  // CEFR ごとに「選ぶべき単語の難度」を指定（その帯の上端＝学ぶ価値の高い語を選ばせる）
  const VOCAB_RULES = {
    A2: "Choose concrete, useful everyday words an A2 learner needs but may not yet know. Avoid trivial words (e.g. good, big, go, make).",
    B1: "Choose mid-frequency B1-edge words: topic nouns, common phrasal verbs and collocations. Avoid very basic words the learner already knows.",
    B2: "Choose upper-intermediate, lower-frequency words: abstract nouns, precise verbs, formal/academic terms (e.g. scrutiny, mitigate, unprecedented, resilient, overhaul). Do NOT pick words an intermediate learner already knows (e.g. reduce, change, important, problem).",
    C1: "Choose advanced, sophisticated, often abstract or idiomatic vocabulary used in quality journalism (e.g. ostensibly, entrenched, nuanced, conflate, tacit, predicated). Avoid anything a B2 learner already knows. Prefer nuance-bearing words.",
    C2: "Choose rare, precise, often literary or formal-register words (e.g. intractable, countervailing, specious, salient, equivocate, trenchant). Avoid anything a C1 reader finds routine.",
  };
  const system =
    `You are an English tutor building a news-based micro-lesson for a Japanese learner at CEFR level ${level}. ` +
    `STRICT LEVEL CONTROL for ${level}: ${LEVEL_RULES[level]} Stay strictly within this level — do not write above or below it. ` +
    `From the article below, (1) write EXACTLY 2 short paragraphs, 60-90 words total, at CEFR ${level} reading difficulty, factual and faithful to the source. ` +
    `(2) Pick EXACTLY 3 vocabulary words that ACTUALLY APPEAR in your two paragraphs and that are the MOST WORTH LEARNING at this level — i.e. near the upper edge of ${level}, NOT the easiest words in the text. VOCAB RULE: ${VOCAB_RULES[level]} ` +
    `(3) Pick ONE grammar point that appears in the article and suits level ${level}. ` +
    `All meanings, explanations and notes must be in Japanese; English examples stay in English; keep every Japanese field concise. ` +
    `Respond with ONLY a raw JSON object (no markdown). Schema:\n` +
    `{"summaryJa":"","paragraphs":["",""],` +
    `"vocabulary":[{"word":"","ipa":"","pos":"","meaningJa":"","exampleEn":"","exampleJa":"","noteJa":""}],` +
    `"grammar":{"title":"","pattern":"","explanationJa":"","fromArticle":"","examplesEn":["",""],"noteJa":""}}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      messages: [
        {
          role: "user",
          content: `HEADLINE: ${article.headline}\n\nARTICLE:\n${article.bodyText}`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const parsed = JSON.parse(text.slice(start, end + 1));

  return {
    topic: article.topic,
    article: {
      headline: article.headline,
      source: "The Guardian",
      when: article.when,
      url: article.url,
      summaryJa: parsed.summaryJa,
      paragraphs: parsed.paragraphs,
    },
    vocabulary: parsed.vocabulary,
    grammar: parsed.grammar,
  };
}

// ---- 3. レベルごとに記事を割り当てて生成 ------------------------------
async function main() {
  const pool = await fetchArticles();
  if (pool.length === 0) {
    console.error("記事が1件も取得できませんでした。");
    process.exit(1);
  }
  // 同じ記事が全レベルに偏らないよう、シャッフルしてから配る
  pool.sort(() => Math.random() - 0.5);

  const lessons = { A2: [], B1: [], B2: [], C1: [] };
  let cursor = 0;

  for (const level of LEVELS) {
    for (let i = 0; i < PER_LEVEL; i++) {
      const article = pool[cursor % pool.length];
      cursor++;
      try {
        const lesson = await makeLesson(article, level);
        lessons[level].push(lesson);
        console.log(`✓ ${level} / ${article.topic} / ${article.headline}`);
      } catch (e) {
        console.warn(`✗ ${level} 生成失敗（スキップ）:`, e.message);
      }
    }
  }

  const out = { generatedAt: new Date().toISOString(), lessons };
  await mkdir("data", { recursive: true });
  await writeFile("data/lessons.json", JSON.stringify(out, null, 2), "utf8");
  console.log("data/lessons.json を書き出しました。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
