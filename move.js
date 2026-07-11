let selectedSquare = null;
let turn = "w";

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
