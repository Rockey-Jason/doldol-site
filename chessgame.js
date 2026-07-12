let selectedSquare = null;
let highlightedSquares = [];
function removeHighlights(){

    highlightedSquares.forEach(square=>{

        $(".square-"+square).removeClass("highlight");

    });

    highlightedSquares=[];

}

function highlightMoves(square){

    removeHighlights();

    const moves=game.moves({

        square:square,

        verbose:true

    });

    moves.forEach(move=>{

        $(".square-"+move.to).addClass("highlight");

        highlightedSquares.push(move.to);

    });

}
function onMouseoverSquare(square){

    if(selectedSquare==null){

        highlightMoves(square);

    }

}

function onMouseoutSquare(){

    if(selectedSquare==null){

        removeHighlights();

    }

}
// 체스 게임 생성
const game = new Chess();

// 체스판 생성
const board = Chessboard("board", {
    draggable: true,
    position: "start",
    pieceTheme: "img/chesspieces/{piece}.png",

    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    onMouseoverSquare:onMouseoverSquare,
onMouseoutSquare:onMouseoutSquare
});
$("#board").on("click",".square-55d63",function(){

    const square=$(this).attr("data-square");

    if(!square) return;

    squareClicked(square);

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

    from:source,

    to:target,

    promotion:"q"

});

if(move===null){

    return "snapback";

}

$(".lastMove").removeClass("lastMove");

$(".square-"+move.from).addClass("lastMove");

$(".square-"+move.to).addClass("lastMove");

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

        status = "checkmate";

    }

    else if (game.in_draw()) {

        status = "draw";

    }

    else {

        status =
            (game.turn() === "w")
                ? "백 차례"
                : "흑 차례";

        if (game.in_check()) {
            status += " (check)";
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
function squareClicked(square){

    if(selectedSquare==null){

        const piece=game.get(square);

        if(piece==null) return;

        if(piece.color!==game.turn()) return;

        selectedSquare=square;

        highlightLegalMoves(square);

        return;

    }

    const move=game.move({

        from:selectedSquare,

        to:square,

        promotion:"q"

    });

    removeHighlights();

    selectedSquare=null;

    if(move==null){

        board.position(game.fen());

        return;

    }

    board.position(game.fen());

    updateStatus();

}
function highlightLegalMoves(square){

    removeHighlights();

    const moves=game.moves({

        square:square,

        verbose:true

    });

    moves.forEach(move=>{

        $(".square-"+move.to).addClass("highlight");

    });

}
function removeHighlights(){

    $(".highlight").removeClass("highlight");

}
