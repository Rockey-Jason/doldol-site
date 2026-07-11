const board = document.getElementById("board");

const files = ["a","b","c","d","e","f","g","h"];

const squares = [];

for(let row = 8; row >= 1; row--){

    for(let col = 0; col < 8; col++){

        const square = document.createElement("div");

        square.classList.add("square");

        // 흰칸 / 검은칸
        if((row + col) % 2 === 0){
            square.classList.add("light");
        }
        else{
            square.classList.add("dark");
        }

        // 좌표 저장
        square.dataset.square = files[col] + row;

        board.appendChild(square);

        squares.push(square);

    }

}
