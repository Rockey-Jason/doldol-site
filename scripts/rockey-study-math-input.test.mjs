import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";

const root = process.cwd();
const context = vm.createContext({
  window: { ROCKEY_FORMULA_COURSE: [] },
  console
});

vm.runInContext(
  fs.readFileSync(path.join(root, "js/rockey-study-formula.js"), "utf8"),
  context,
  { filename: "rockey-study-formula.js" }
);
vm.runInContext(
  fs.readFileSync(path.join(root, "js/rockey-study-math-input.js"), "utf8"),
  context,
  { filename: "rockey-study-math-input.js" }
);

const course = context.window.ROCKEY_FORMULA_COURSE;
const math = context.window.ROCKEY_MATH_INPUT;
assert.ok(Array.isArray(course), "course data should be available");
assert.ok(math && typeof math.check === "function", "math checker should be available");

function expectCorrect(input, answer, label) {
  const result = math.check(input, answer);
  assert.equal(result.correct, true, label + ": " + (result.error || "expression was not accepted"));
}

function expectWrong(input, answer, label) {
  const result = math.check(input, answer);
  assert.equal(result.correct, false, label + ": incorrect expression was accepted");
}

test("course has a unique formula catalog spanning all 12 grades", () => {
  assert.ok(course.length >= 190, "expected at least 190 formula cards, got " + course.length);
  const ids = course.map(card => card.id);
  assert.equal(new Set(ids).size, ids.length, "formula IDs must be unique");
  for (let grade = 1; grade <= 12; grade++) {
    assert.ok(course.some(card => card.grade === grade), "missing grade " + grade);
  }
  assert.ok(course.filter(card => card.quiz !== false).every(card => card.answer !== undefined),
    "every active quiz card needs a typed answer");
});

test("implicit multiplication and like-term arithmetic are equivalent", () => {
  expectCorrect("2x+3x", "5*x", "implicit multiplication");
  expectCorrect("2(x+1)", "2*x+2", "parenthesized multiplication");
  expectCorrect("(a+b)(a-b)", "a^2-b^2", "conjugate product");
});

test("powers, square roots, constants, and superscripts are accepted", () => {
  expectCorrect("x²", "x^2", "superscript 2");
  expectCorrect("√(a^2)", "a", "square root");
  expectCorrect("pi*r^2", "πr²", "pi and superscript");
  expectCorrect("sqrt(4)", "2", "numeric square root");
});

test("equations are checked up to rearrangement and nonzero scaling", () => {
  expectCorrect("x=2", "2x=4", "scaled equations");
  expectCorrect("c^2=a^2+b^2", "a^2+b^2=c^2", "reordered equation");
  expectCorrect("a/b=(a*n)/(b*n)", "a/b=a*n/(b*n)", "fraction equivalence");
});

test("plus-minus and multi-part formula answers work", () => {
  const roots = [
    "x=(-b+sqrt(b^2-4*a*c))/(2*a)",
    "x=(-b-sqrt(b^2-4*a*c))/(2*a)"
  ];
  expectCorrect("x=(-b±sqrt(b²-4ac))/(2a)", roots, "quadratic formula");
  expectCorrect("alpha+beta=-b/a; alpha*beta=c/a",
    "alpha+beta=-b/a;alpha*beta=c/a", "two-part formula");
  expectCorrect("11,13", "11;13", "comma-separated numeric answers");
});

test("factorials, inequalities, and calculator functions work", () => {
  expectCorrect("n!/(n-r)!", "n!/(n-r)!", "factorial expression");
  expectCorrect("9>6", "9 > 6", "greater-than relation");
  expectCorrect("sin(theta)^2+cos(theta)^2", "1", "trigonometric identity");
  expectCorrect("abs(-x)", "x", "absolute value of positive sample values");
});

test("incorrect answers and malformed expressions are rejected safely", () => {
  expectWrong("x^2+1", "x^2-1", "wrong sign");
  expectWrong("2x+3", "2x+4", "wrong constant");
  assert.equal(math.check("sqrt(", "2").correct, false, "incomplete radical should be rejected");
  assert.equal(math.check("2/0", "2").correct, false, "division by zero should be rejected");
});
