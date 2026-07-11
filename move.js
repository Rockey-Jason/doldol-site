let promotionSquare=null;
let selectedSquare = null;
let turn = "w";
let moved = {

    wk:false,
    bk:false,

    wa1:false,
    wh1:false,

    ba8:false,
    bh8:false

};

// 말의 이동 방향
const knightMoves = [
    [-2,-1],[-2,1],
    [-1,-2],[-1,2],
    [1,-2],[1,2],
    [2,-1],[2,1]
];

// 모든 칸
const squares = [...document.querySelectorAll(".square")];

// 좌표 → 칸
function getSquare(pos){

    return document.querySelector(
        `[data-square="${pos}"]`
    );

}

// a1 → {x,y}
function parse(pos){

    return{

        x:pos.charCodeAt(0)-97,
        y:Number(pos[1])-1

    };

}

// {x,y} → a1
function makePos(x,y){

    return String.fromCharCode(97+x)+(y+1);

}

// 선택 해제
function clearHighlights(){

    squares.forEach(square=>{

        square.classList.remove("selected");
        square.classList.remove("move");

    });

}

// 이동 가능한 칸 계산
function getMoves(square){

    const piece=square.dataset.piece;

    if(!piece) return [];

    const color=piece[0];
    const type=piece[1];

    const pos=parse(square.dataset.square);

    const moves=[];

    // ===== 폰 =====

    if(type==="p"){

        const dir=color==="w"?1:-1;

        const one=makePos(pos.x,pos.y+dir);

        const target=getSquare(one);

        if(target && !target.dataset.piece){

            moves.push(one);

        }

    }

    // ===== 나이트 =====

    else if(type==="n"){

        knightMoves.forEach(move=>{

            const nx=pos.x+move[0];
            const ny=pos.y+move[1];

            if(nx<0||nx>7||ny<0||ny>7)
                return;

            const target=makePos(nx,ny);

            const sq=getSquare(target);

            if(!sq.dataset.piece){

                moves.push(target);

            }
            else{

                if(sq.dataset.piece[0]!=color)
                    moves.push(target);

            }

        });

    }

    // ===== 킹 =====

    else if(type==="k"){

        for(let dx=-1;dx<=1;dx++){

            for(let dy=-1;dy<=1;dy++){

                if(dx===0&&dy===0) continue;

                const nx=pos.x+dx;
                const ny=pos.y+dy;

                if(nx<0||nx>7||ny<0||ny>7)
                    continue;

                const target=makePos(nx,ny);

                const sq=getSquare(target);

                if(!sq.dataset.piece){

                    moves.push(target);

                }
                else{

                    if(sq.dataset.piece[0]!=color)
                        moves.push(target);

                }

            }

        }
// ===== 캐슬링 =====
if(color==="w"&&!moved.wk){

    // 킹사이드

    if(
        !moved.wh1 &&
        !getSquare("f1").dataset.piece &&
        !getSquare("g1").dataset.piece
    ){

        moves.push("g1");

    }

    // 퀸사이드

    if(
        !moved.wa1 &&
        !getSquare("b1").dataset.piece &&
        !getSquare("c1").dataset.piece &&
        !getSquare("d1").dataset.piece
    ){

        moves.push("c1");

    }

}
if(color==="b"&&!moved.bk){

    if(
        !moved.bh8 &&
        !getSquare("f8").dataset.piece &&
        !getSquare("g8").dataset.piece
    ){

        moves.push("g8");

    }

    if(
        !moved.ba8 &&
        !getSquare("b8").dataset.piece &&
        !getSquare("c8").dataset.piece &&
        !getSquare("d8").dataset.piece
    ){

        moves.push("c8");

    }

}
    }

    return moves;

else if(type==="r"){

    const dirs=[
        [1,0],
        [-1,0],
        [0,1],
        [0,-1]
    ];

    dirs.forEach(dir=>{

        let nx=pos.x;
        let ny=pos.y;

        while(true){

            nx+=dir[0];
            ny+=dir[1];

            if(nx<0||nx>7||ny<0||ny>7)
                break;

            const target=makePos(nx,ny);

            const sq=getSquare(target);

            if(!sq.dataset.piece){

                moves.push(target);

            }else{

                if(sq.dataset.piece[0]!=color)
                    moves.push(target);

                break;

            }

        }

    });

}
else if(type==="b"){

    const dirs=[
        [1,1],
        [1,-1],
        [-1,1],
        [-1,-1]
    ];

    dirs.forEach(dir=>{

        let nx=pos.x;
        let ny=pos.y;

        while(true){

            nx+=dir[0];
            ny+=dir[1];

            if(nx<0||nx>7||ny<0||ny>7)
                break;

            const target=makePos(nx,ny);

            const sq=getSquare(target);

            if(!sq.dataset.piece){

                moves.push(target);

            }else{

                if(sq.dataset.piece[0]!=color)
                    moves.push(target);

                break;

            }

        }

    });

}
else if(type==="q"){

    const dirs=[
        [1,0],[-1,0],
        [0,1],[0,-1],
        [1,1],[1,-1],
        [-1,1],[-1,-1]
    ];

    dirs.forEach(dir=>{

        let nx=pos.x;
        let ny=pos.y;

        while(true){

            nx+=dir[0];
            ny+=dir[1];

            if(nx<0||nx>7||ny<0||ny>7)
                break;

            const target=makePos(nx,ny);

            const sq=getSquare(target);

            if(!sq.dataset.piece){

                moves.push(target);

            }else{

                if(sq.dataset.piece[0]!=color)
                    moves.push(target);

                break;

            }

        }

    });

}
}

// 클릭
squares.forEach(square=>{

    square.addEventListener("click",()=>{

        const piece=square.dataset.piece;

        // 선택된 말이 없는 경우

        if(!selectedSquare){

            if(!piece) return;

            if(piece[0]!=turn) return;

            selectedSquare=square;

            clearHighlights();

            square.classList.add("selected");

            getMoves(square).forEach(move=>{

                getSquare(move).classList.add("move");

            });

            return;

        }

        // 이동

        if(square.classList.contains("move")){

            square.textContent=
                selectedSquare.textContent;

            square.dataset.piece=
                selectedSquare.dataset.piece;
            const movedPiece = square.dataset.piece;

if(movedPiece==="wk") moved.wk=true;
if(movedPiece==="bk") moved.bk=true;

if(selectedSquare.dataset.square==="a1") moved.wa1=true;
if(selectedSquare.dataset.square==="h1") moved.wh1=true;

if(selectedSquare.dataset.square==="a8") moved.ba8=true;
if(selectedSquare.dataset.square==="h8") moved.bh8=true;
// ===== 캐슬링 실제 이동 =====

if(square.dataset.square==="g1" &&
selectedSquare.dataset.square==="e1"){

    const rook=getSquare("h1");
    const target=getSquare("f1");

    target.textContent=rook.textContent;
    target.dataset.piece=rook.dataset.piece;

    rook.textContent="";
    delete rook.dataset.piece;

}

if(square.dataset.square==="c1" &&
selectedSquare.dataset.square==="e1"){

    const rook=getSquare("a1");
    const target=getSquare("d1");

    target.textContent=rook.textContent;
    target.dataset.piece=rook.dataset.piece;

    rook.textContent="";
    delete rook.dataset.piece;

}

if(square.dataset.square==="g8" &&
selectedSquare.dataset.square==="e8"){

    const rook=getSquare("h8");
    const target=getSquare("f8");

    target.textContent=rook.textContent;
    target.dataset.piece=rook.dataset.piece;

    rook.textContent="";
    delete rook.dataset.piece;

}

if(square.dataset.square==="c8" &&
selectedSquare.dataset.square==="e8"){

    const rook=getSquare("a8");
    const target=getSquare("d8");

    target.textContent=rook.textContent;
    target.dataset.piece=rook.dataset.piece;

    rook.textContent="";
    delete rook.dataset.piece;

}
            selectedSquare.textContent="";
            delete selectedSquare.dataset.piece;

            turn=turn==="w"?"b":"w";

            document.getElementById("turn").textContent=
                turn==="w"?"White":"Black";

        }

        selectedSquare=null;

        clearHighlights();

    });

});
