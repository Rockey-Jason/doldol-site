// 체스 시작 배치
const startPosition = {

    // 흑
    a8:"br",
    b8:"bn",
    c8:"bb",
    d8:"bq",
    e8:"bk",
    f8:"bb",
    g8:"bn",
    h8:"br",

    a7:"bp",
    b7:"bp",
    c7:"bp",
    d7:"bp",
    e7:"bp",
    f7:"bp",
    g7:"bp",
    h7:"bp",

    // 백
    a2:"wp",
    b2:"wp",
    c2:"wp",
    d2:"wp",
    e2:"wp",
    f2:"wp",
    g2:"wp",
    h2:"wp",

    a1:"wr",
    b1:"wn",
    c1:"wb",
    d1:"wq",
    e1:"wk",
    f1:"wb",
    g1:"wn",
    h1:"wr"

};

// 유니코드 체스 기물
const pieceUnicode = {

    wk:"♔",
    wq:"♕",
    wr:"♖",
    wb:"♗",
    wn:"♘",
    wp:"♙",

    bk:"♚",
    bq:"♛",
    br:"♜",
    bb:"♝",
    bn:"♞",
    bp:"♟"

};

// 체스판에 배치
document.querySelectorAll(".square").forEach(square=>{

    const pos = square.dataset.square;

    if(startPosition[pos]){

        square.textContent = pieceUnicode[startPosition[pos]];

        square.dataset.piece = startPosition[pos];

    }

});
