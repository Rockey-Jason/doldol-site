let selectedSquare = null;
let highlightedSquares = [];
// 체스 게임 생성
const game = new Chess();

// 체스판 생성
const board = Chessboard("board", {
    draggable: true,
    position: "start",
    pieceTheme: "img/chesspieces/{piece}.png",

    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
});

// ----------------------------
// 말을 집을 수 있는지 확인
// ----------------------------
function onDragStart(source, piece) {

    // 게임 끝났으면 이동 불가
    if (game.game_over()) return false;

    // 현재 턴이 아닌 말은 이동 불가
    if (
        (game.turn() === "w" && piece.startsWith("b")) ||
        (game.turn() === "b" && piece.startsWith("w"))
    ) {
        return false;
    }
}

// ----------------------------
// 말 놓기
// ----------------------------
function onDrop(source, target) {

    const move = game.move({
        from: source,
        to: target,
        promotion: "q"   // 일단 자동 퀸 승격
    });

    // 잘못된 수
    if (move === null) {
        return "snapback";
    }

    updateStatus();
}

// ----------------------------
// 말 이동 후 체스판 새로 그림
// ----------------------------
function onSnapEnd() {
    board.position(game.fen());
}

// ----------------------------
// 상태 표시
// ----------------------------
function updateStatus() {

    let status = "";

    if (game.in_checkmate()) {

        status = "체크메이트!";

    }

    else if (game.in_draw()) {

        status = "무승부";

    }

    else {

        status =
            (game.turn() === "w")
                ? "백 차례"
                : "흑 차례";

        if (game.in_check()) {
            status += " (체크)";
        }

    }

    document.getElementById("turnText").textContent =
        game.turn() === "w"
            ? "White to move"
            : "Black to move";

    document.getElementById("statusText").textContent =
        status;

}

// ----------------------------
// 다시 시작
// ----------------------------
document.getElementById("restartButton").onclick = function(){

    game.reset();

    board.start();

    updateStatus();

};

// 처음 상태 표시
updateStatus();
