/* ROCKEY STUDY · searchable catalogue and adaptive review helpers */
(function (root) {
  "use strict";

  var GRADE_NAMES = {
    1:"초등학교 1학년",2:"초등학교 2학년",3:"초등학교 3학년",4:"초등학교 4학년",5:"초등학교 5학년",6:"초등학교 6학년",
    7:"중학교 1학년",8:"중학교 2학년",9:"중학교 3학년",
    10:"고등학교 1학년",11:"고등학교 2학년",12:"고등학교 3학년"
  };

  function normalize(value) {
    return String(value == null ? "" : value)
      .toLocaleLowerCase("ko-KR")
      .replace(/[×·⋅]/g, "*")
      .replace(/[−–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function recordFor(progressCards, card) {
    return progressCards && typeof progressCards === "object" &&
      Object.prototype.hasOwnProperty.call(progressCards, card.id) &&
      progressCards[card.id] && typeof progressCards[card.id] === "object"
      ? progressCards[card.id] : {};
  }

  function statusOf(record) {
    if (record.review) return "review";
    if (record.mastered) return "mastered";
    if (record.seen || Number(record.attempts) > 0) return "learning";
    return "unseen";
  }

  function statusLabel(record) {
    if (record.review) return "복습 필요";
    var status = statusOf(record);
    return status === "mastered" ? "마스터" : status === "learning" ? "학습 중" : "새 공식";
  }

  function shortGrade(grade) {
    if (grade <= 6) return "초" + grade;
    if (grade <= 9) return "중" + (grade - 6);
    return "고" + (grade - 9);
  }

  function fieldsFor(card) {
    var fields = normalize([
      card.title, card.topic, card.question, card.formula,
      card.explain, card.example, card.memory,
      GRADE_NAMES[card.grade], shortGrade(card.grade),
      "초중고 " + card.grade
    ].join(" "));
    return fields + " " + fields.replace(/\s+/g, "");
  }

  function statusRank(record) {
    var status = statusOf(record);
    if (status === "review") return 0;
    if (status === "learning") return 1;
    if (status === "unseen") return 2;
    return record.review ? 3 : 4;
  }

  function accuracy(record) {
    var attempts = Number(record.attempts) || 0;
    if (!attempts) return 1;
    return (Number(record.correct) || 0) / attempts;
  }

  function searchCards(course, progressCards, query, filter, currentGrade, limit) {
    var words = normalize(query).split(" ").filter(Boolean);
    var selected = (Array.isArray(course) ? course : []).filter(function (card) {
      var record = recordFor(progressCards, card);
      var status = statusOf(record);
      if (filter === "unseen" && status !== "unseen") return false;
      if (filter === "learning" && status !== "learning") return false;
      if (filter === "review" && !record.review) return false;
      if (filter === "mastered" && !record.mastered) return false;
      if (!words.length) return true;
      var haystack = fieldsFor(card);
      return words.every(function (word) { return haystack.indexOf(word) !== -1; });
    });

    selected.sort(function (a, b) {
      var ar = recordFor(progressCards, a);
      var br = recordFor(progressCards, b);
      var phrase = normalize(query);
      var aExact = phrase && normalize(a.title).indexOf(phrase) === 0 ? -1 : 0;
      var bExact = phrase && normalize(b.title).indexOf(phrase) === 0 ? -1 : 0;
      if (aExact !== bExact) return aExact - bExact;
      if (currentGrade && (a.grade === currentGrade) !== (b.grade === currentGrade)) {
        return a.grade === currentGrade ? -1 : 1;
      }
      if (filter === "all" && statusRank(ar) !== statusRank(br)) return statusRank(ar) - statusRank(br);
      if (accuracy(ar) !== accuracy(br) && statusOf(ar) === "learning" && statusOf(br) === "learning") {
        return accuracy(ar) - accuracy(br);
      }
      return a.grade - b.grade || normalize(a.title).localeCompare(normalize(b.title), "ko");
    });

    var total = selected.length;
    var max = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : total;
    return { results: selected.slice(0, max), total: total };
  }

  function recommendCard(course, progressCards, currentGrade) {
    var candidates = (Array.isArray(course) ? course : []).map(function (card) {
      return { card: card, record: recordFor(progressCards, card) };
    }).filter(function (item) {
      return !item.record.mastered || item.record.review;
    });

    if (!candidates.length) return { card: null, reason: "모든 공식의 마스터를 완료했어. 원하는 공식을 검색해서 한 번 더 복습해 봐!" };

    candidates.sort(function (a, b) {
      var aRank = statusRank(a.record);
      var bRank = statusRank(b.record);
      if (aRank !== bRank) return aRank - bRank;
      if (aRank === 1 && accuracy(a.record) !== accuracy(b.record)) return accuracy(a.record) - accuracy(b.record);
      if (currentGrade && (a.card.grade === currentGrade) !== (b.card.grade === currentGrade)) {
        return a.card.grade === currentGrade ? -1 : 1;
      }
      return a.card.grade - b.card.grade || normalize(a.card.title).localeCompare(normalize(b.card.title), "ko");
    });

    var chosen = candidates[0];
    var status = statusOf(chosen.record);
    var reason = status === "review"
      ? "복습 표시한 공식이야. 한 번 더 풀어 보며 기억을 단단하게 만들어 보자."
      : status === "learning"
        ? "전에 풀어 봤지만 아직 익숙하지 않은 공식이야. 취약한 부분부터 다시 확인하자."
        : "아직 열어 보지 않은 새 공식이야. 개념부터 차근차근 시작해 보자.";
    return { card: chosen.card, reason: reason };
  }

  root.ROCKEY_STUDY_TOOLS = {
    searchCards: searchCards,
    recommendCard: recommendCard,
    statusOf: statusOf,
    statusLabel: statusLabel
  };
})(window);
