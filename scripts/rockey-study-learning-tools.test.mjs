import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../js/rockey-study-learning-tools.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "rockey-study-learning-tools.js" });
const tools = sandbox.window.ROCKEY_STUDY_TOOLS;
assert.ok(tools, "study helper API should be exposed");
const gameSource = fs.readFileSync(new URL("../js/rockey-study-formula-game.js", import.meta.url), "utf8");
assert.match(gameSource, /data-action="practice-current"/, "lesson cards should provide a direct practice action");
assert.doesNotMatch(gameSource, /data-action="master"/, "mastery must not be granted by a manual completion button");
assert.match(gameSource, /session\.wasCorrect&&session\.type==="practice"\)record\.mastered=true;/, "a correct direct practice answer should grant mastery");
assert.match(gameSource, /else if\(!session\.wasCorrect\)\{\s*record\.review=true;/, "incorrect formula answers should automatically enter the review queue");
assert.match(gameSource, /record\.mastered=true;\s*record\.review=false;/, "a correct focused practice answer should clear the review flag");

const course = [
  { id: "pythagoras", grade: 7, topic: "도형", title: "피타고라스 정리", question: "직각삼각형의 빗변", formula: "a^2+b^2=c^2", explain: "세 변의 관계", example: "3^2+4^2=5^2" },
  { id: "triangle-area", grade: 6, topic: "도형", title: "삼각형의 넓이", question: "밑변과 높이를 이용한 넓이", formula: "a*h/2", explain: "밑변과 높이를 곱해 2로 나눠", example: "밑변 4, 높이 3" },
  { id: "log-rule", grade: 11, topic: "로그", title: "로그의 곱셈 성질", question: "로그 곱셈 공식", formula: "log(x*y)=log(x)+log(y)", explain: "로그의 성질", example: "log(2*3)" },
  { id: "linear-function", grade: 7, topic: "함수", title: "일차함수", question: "기울기와 y절편", formula: "y=a*x+b", explain: "직선의 식", example: "y=2x+1" }
];

const progress = {
  pythagoras: { seen: true, mastered: false, review: true, attempts: 3, correct: 1 },
  "triangle-area": { seen: true, mastered: true, review: false, attempts: 1, correct: 1 },
  "linear-function": { seen: true, mastered: false, review: false, attempts: 2, correct: 2 }
};

assert.deepEqual(
  Array.from(tools.searchCards(course, progress, "피타고라스", "all", null, 10).results, item => item.id),
  ["pythagoras"],
  "Korean title search should find the expected formula"
);
assert.deepEqual(
  Array.from(tools.searchCards(course, progress, "삼각형 넓이", "all", null, 10).results, item => item.id),
  ["triangle-area"],
  "multi-word search should match words across the card fields"
);
assert.deepEqual(
  Array.from(tools.searchCards(course, progress, "삼각형넓이", "all", null, 10).results, item => item.id),
  ["triangle-area"],
  "compact Korean searches should work even when the user omits spaces"
);
assert.deepEqual(
  Array.from(tools.searchCards(course, progress, "중1 피타고라스", "all", null, 10).results, item => item.id),
  ["pythagoras"],
  "short grade labels should be searchable"
);
assert.deepEqual(
  Array.from(tools.searchCards(course, progress, "log(x)", "all", null, 10).results, item => item.id),
  ["log-rule"],
  "search should include formula expressions"
);
assert.deepEqual(
  Array.from(tools.searchCards(course, progress, "", "unseen", null, 10).results, item => item.id),
  ["log-rule"],
  "unseen filter should return cards not yet opened"
);
assert.deepEqual(
  Array.from(tools.searchCards(course, progress, "", "learning", null, 10).results, item => item.id),
  ["linear-function"],
  "learning filter should exclude unseen, review, and mastered cards"
);
assert.deepEqual(
  Array.from(tools.searchCards(course, progress, "", "review", null, 10).results, item => item.id),
  ["pythagoras"],
  "review filter should return marked cards"
);
assert.deepEqual(
  Array.from(tools.searchCards(course, progress, "", "mastered", null, 10).results, item => item.id),
  ["triangle-area"],
  "mastered filter should return completed cards"
);

const reviewFirst = tools.recommendCard(course, progress, 11);
assert.equal(reviewFirst.card.id, "pythagoras", "a marked review item should be recommended before unseen content");
assert.match(reviewFirst.reason, /복습/);

const weakProgress = {
  pythagoras: { seen: true, mastered: false, review: false, attempts: 3, correct: 1 },
  "linear-function": { seen: true, mastered: false, review: false, attempts: 2, correct: 2 }
};
assert.equal(
  tools.recommendCard(course, weakProgress, 11).card.id,
  "pythagoras",
  "the least accurate in-progress formula should be recommended before new content"
);

const masteredProgress = {
  pythagoras: { mastered: true },
  "triangle-area": { mastered: true },
  "log-rule": { mastered: true },
  "linear-function": { mastered: true }
};
assert.equal(
  tools.recommendCard(course, masteredProgress, null).card,
  null,
  "the recommender should clearly report when everything is mastered"
);

assert.equal(tools.statusLabel({ review: true, mastered: false }), "복습 필요");
assert.equal(tools.statusLabel({ mastered: true }), "마스터");
assert.equal(tools.statusLabel({ seen: true }), "학습 중");
assert.equal(tools.statusLabel({}), "새 공식");

console.log("Rockey Study learning-tools tests passed.");
