/* ROCKEY STUDY · MATHEMATICS FORMULA COURSE
   12-grade core concept map. Formula order is designed for learning, not textbook page order. */
(function () {
  "use strict";

  window.ROCKEY_FORMULA_COURSE = [
    {id:"p1-order",grade:1,topic:"수 감각",title:"앞수와 뒷수",question:"12의 바로 앞수와 바로 뒷수는?",formula:"11, 13",explain:"수직선에서 12의 왼쪽 한 칸은 11, 오른쪽 한 칸은 13이야. 어떤 수 n의 앞수는 n−1, 뒷수는 n+1이야.",example:"12−1=11 · 12+1=13",memory:"앞으로 한 칸, 뒤로 한 칸!"},
    {id:"p1-ten",grade:1,topic:"덧셈과 뺄셈",title:"10 만들기",question:"8과 짝을 이루어 10을 만드는 수는?",formula:"8 + 2 = 10",explain:"10을 만들면 덧셈과 뺄셈을 더 쉽게 계산할 수 있어. 10에서 모자란 만큼을 더하면 돼.",example:"7+3=10 · 10−3=7",memory:"10까지 몇 칸 남았는지 찾아봐!"},
    {id:"p1-add",grade:1,topic:"덧셈과 뺄셈",title:"덧셈의 뜻",question:"3개와 4개를 합치면 모두 몇 개일까?",formula:"3 + 4 = 7",explain:"덧셈은 두 수를 하나로 모으는 계산이야. 더한 결과를 합이라고 해.",example:"5+2=7",memory:"합은 모두 모은 개수!"},
    {id:"p1-sub",grade:1,topic:"덧셈과 뺄셈",title:"뺄셈의 뜻",question:"사탕 9개 중 4개를 먹었다면 남은 개수는?",formula:"9 − 4 = 5",explain:"뺄셈은 전체에서 일부를 덜어 내거나 두 수의 차이를 알아보는 계산이야.",example:"8−3=5",memory:"남은 수 또는 차이를 구해!"},
    {id:"p1-compare",grade:1,topic:"수 감각",title:"크기 비교 기호",question:"왼쪽 수가 오른쪽 수보다 클 때 쓰는 기호는?",formula:"큰 수 > 작은 수",explain:"기호의 벌어진 쪽이 더 큰 수를 향해. 같으면 =, 작으면 <를 써.",example:"9>6 · 4<7 · 5=5",memory:"기호의 입을 큰 수 쪽으로!"},
    {id:"p1-time",grade:1,topic:"생활 속 수학",title:"시각과 시간",question:"1시간은 몇 분일까?",formula:"1시간 = 60분",explain:"시계의 긴바늘이 한 바퀴 돌면 60분, 즉 1시간이 지나.",example:"2시간=120분",memory:"한 시간은 60분!"},
    
    {id:"p2-place",grade:2,topic:"수 감각",title:"두 자리 수",question:"십의 자리 숫자가 a, 일의 자리 숫자가 b인 수는?",formula:"10a + b",explain:"두 자리 수는 십의 자리 값과 일의 자리 값을 더해 나타낼 수 있어.",example:"34=10×3+4",memory:"십의 자리는 10배!"},
    {id:"p2-times",grade:2,topic:"곱셈과 나눗셈",title:"곱셈은 같은 수의 더하기",question:"3을 4번 더한 것을 곱셈으로 나타내면?",formula:"3 + 3 + 3 + 3 = 3 × 4",explain:"같은 수를 여러 번 더할 때 곱셈을 쓰면 간단해져. 구구단은 이 원리를 빠르게 계산하는 방법이야.",example:"7×8=56",memory:"곱셈은 같은 수를 묶어 더하는 계산!"},
    {id:"p2-divide",grade:2,topic:"곱셈과 나눗셈",title:"나눗셈의 뜻",question:"12개를 3개씩 묶으면 몇 묶음일까?",formula:"12 ÷ 3 = 4",explain:"나눗셈은 똑같이 나누거나 같은 크기로 묶을 때 사용하는 계산이야.",example:"20÷5=4",memory:"전체 ÷ 한 묶음의 크기 = 묶음 수!"},
    {id:"p2-inverse",grade:2,topic:"곱셈과 나눗셈",title:"곱셈과 나눗셈의 관계",question:"6×7=42일 때 42를 6으로 나누면?",formula:"a × b = c  ⇔  c ÷ a = b",explain:"곱셈과 나눗셈은 서로 반대 방향으로 확인할 수 있어. 계산한 답이 맞는지 곱셈으로 검산해 봐.",example:"6×7=42 → 42÷6=7",memory:"곱셈을 거꾸로 하면 나눗셈!"},
    {id:"p2-length",grade:2,topic:"생활 속 수학",title:"길이의 단위",question:"1m는 몇 cm일까?",formula:"1m = 100cm",explain:"미터는 센티미터보다 큰 길이 단위야. m를 cm로 바꿀 때는 100을 곱해.",example:"3m=300cm",memory:"미터 하나에 센티미터 100개!"},
    {id:"p2-calendar",grade:2,topic:"생활 속 수학",title:"시간 단위",question:"하루는 몇 시간일까?",formula:"1일 = 24시간",explain:"하루는 아침부터 다음 날 아침까지의 시간으로 24시간이야. 일주일은 7일이야.",example:"2일=48시간 · 1주일=7일",memory:"하루 24시간, 한 주 7일!"},
    
    {id:"p3-multiply",grade:3,topic:"곱셈과 나눗셈",title:"곱셈의 교환법칙",question:"곱하는 두 수의 순서를 바꾸어도 결과는?",formula:"a × b = b × a",explain:"곱셈에서는 두 수의 순서를 바꾸어도 곱이 같아. 계산하기 쉬운 순서로 바꿔도 돼.",example:"4×7=7×4=28",memory:"곱셈은 순서를 바꿔도 그대로!"},
    {id:"p3-remainder",grade:3,topic:"곱셈과 나눗셈",title:"나머지가 있는 나눗셈",question:"나누어지는 수를 나눗셈의 결과로 나타내면?",formula:"나누어지는 수 = 나누는 수 × 몫 + 나머지",explain:"나머지는 나누는 수보다 항상 작아야 해. 이 식으로 나눗셈 결과를 확인할 수 있어.",example:"17=5×3+2",memory:"나누는 수×몫에 나머지를 더해!"},
    {id:"p3-rect-perimeter",grade:3,topic:"도형과 측정",title:"직사각형의 둘레",question:"가로가 a, 세로가 b인 직사각형의 둘레는?",formula:"둘레 = 2 × (가로 + 세로)",explain:"둘레는 도형의 테두리를 한 바퀴 돈 길이야. 가로와 세로가 각각 두 번씩 나타나.",example:"가로 5cm, 세로 3cm → 16cm",memory:"가로와 세로를 더하고 두 배!"},
    {id:"p3-square-perimeter",grade:3,topic:"도형과 측정",title:"정사각형의 둘레",question:"한 변이 a인 정사각형의 둘레는?",formula:"둘레 = 4 × 한 변",explain:"정사각형은 네 변의 길이가 모두 같아. 한 변의 길이를 네 번 더하면 둘레가 돼.",example:"한 변 6cm → 4×6=24cm",memory:"같은 변이 네 개!"},
    {id:"p3-fraction",grade:3,topic:"분수",title:"분수의 뜻",question:"전체를 똑같이 5조각으로 나눈 3조각은?",formula:"3/5",explain:"분모 5는 전체를 나눈 조각 수, 분자 3은 그중 선택한 조각 수를 나타내.",example:"케이크 5조각 중 3조각 → 3/5",memory:"분모는 전체 조각, 분자는 고른 조각!"},
    {id:"p3-km",grade:3,topic:"생활 속 수학",title:"킬로미터와 미터",question:"1km는 몇 m일까?",formula:"1km = 1,000m",explain:"킬로미터는 긴 거리를 나타낼 때 쓰는 단위야. km를 m로 바꿀 때는 1,000을 곱해.",example:"2km=2,000m",memory:"킬로는 1,000!"},
    
    {id:"p4-ten-thousand",grade:4,topic:"수와 연산",title:"만과 억의 크기",question:"1만은 얼마일까?",formula:"1만 = 10,000",explain:"큰 수는 네 자리씩 묶어 읽으면 편리해. 만 다음에는 억 단위도 사용해.",example:"3만 2천 = 32,000",memory:"만은 0이 네 개!"},
    {id:"p4-triangle-angle",grade:4,topic:"도형과 측정",title:"삼각형의 내각의 합",question:"삼각형의 세 내각을 모두 더하면?",formula:"A + B + C = 180°",explain:"삼각형의 세 각을 한 점에 모으면 일직선의 각과 같은 180°가 돼.",example:"50°+60°+70°=180°",memory:"삼각형 각 세 개는 180도!"},
    {id:"p4-angle",grade:4,topic:"도형과 측정",title:"각의 크기",question:"평각과 한 바퀴의 각은 각각 몇 도일까?",formula:"평각 = 180° · 한 바퀴 = 360°",explain:"반 바퀴를 돌면 평각 180°, 한 바퀴를 모두 돌면 360°야.",example:"직각 90° × 4 = 360°",memory:"반 바퀴 180, 한 바퀴 360!"},
    {id:"p4-rect-area",grade:4,topic:"도형과 측정",title:"직사각형의 넓이",question:"가로 a, 세로 b인 직사각형의 넓이는?",formula:"넓이 = 가로 × 세로",explain:"단위 정사각형이 가로로 a개, 세로로 b줄 있다고 생각하면 전체 개수는 a×b야.",example:"가로 8cm, 세로 4cm → 32cm²",memory:"넓이는 가로 곱하기 세로!"},
    {id:"p4-decimal",grade:4,topic:"분수와 소수",title:"소수의 자리값",question:"0.1과 0.01을 분수로 나타내면?",formula:"0.1 = 1/10 · 0.01 = 1/100",explain:"소수 첫째 자리는 1/10, 둘째 자리는 1/100의 자리야.",example:"0.37 = 3/10 + 7/100",memory:"소수점 뒤 한 칸은 10분의 1!"},
    {id:"p4-area-unit",grade:4,topic:"도형과 측정",title:"넓이 단위 바꾸기",question:"1cm²는 몇 mm²일까?",formula:"1cm² = 100mm²",explain:"1cm는 10mm야. 넓이는 가로와 세로를 모두 바꾸므로 10×10=100이 돼.",example:"3cm²=300mm²",memory:"넓이 단위는 변환 비율을 두 번 곱해!"},
    
    {id:"p5-fraction-eq",grade:5,topic:"분수와 소수",title:"분수의 통분",question:"분모와 분자에 같은 수를 곱하면 분수의 값은?",formula:"a/b = (a×n)/(b×n)",explain:"0이 아닌 같은 수를 분자와 분모에 곱하거나 나누어도 분수의 크기는 변하지 않아.",example:"2/3 = 4/6 = 6/9",memory:"분자와 분모를 똑같이 바꿔!"},
    {id:"p5-fraction-add",grade:5,topic:"분수와 소수",title:"분모가 다른 분수의 덧셈",question:"분모가 다른 분수를 더하기 전에 무엇을 할까?",formula:"공통분모로 통분한 뒤 분자를 더한다",explain:"분모가 달라도 같은 크기의 조각으로 맞추면 더할 수 있어. 분모는 그대로 두고 분자끼리 더해.",example:"1/2+1/3=3/6+2/6=5/6",memory:"먼저 통분, 다음에 분자 더하기!"},
    {id:"p5-fraction-mul",grade:5,topic:"분수와 소수",title:"분수의 곱셈",question:"두 분수 a/b와 c/d를 곱하면?",formula:"(a/b) × (c/d) = (a×c)/(b×d)",explain:"분수의 곱셈은 분자는 분자끼리, 분모는 분모끼리 곱해. 계산 전 약분하면 더 편리해.",example:"2/3×3/4=6/12=1/2",memory:"위는 위끼리, 아래는 아래끼리!"},
    {id:"p5-decimal-mul",grade:5,topic:"분수와 소수",title:"소수의 곱셈",question:"소수의 곱셈에서 소수점은 어떻게 정할까?",formula:"소수점 아래 자리 수를 합해 정한다",explain:"먼저 소수점을 무시하고 곱한 뒤, 두 수의 소수 자릿수를 합한 만큼 오른쪽에서 소수점을 찍어.",example:"1.2×0.3=0.36",memory:"곱한 뒤 소수 자릿수를 세어 봐!"},
    {id:"p5-triangle-area",grade:5,topic:"도형과 측정",title:"삼각형의 넓이",question:"밑변 a, 높이 h인 삼각형의 넓이는?",formula:"넓이 = (밑변 × 높이) ÷ 2",explain:"삼각형 두 개를 붙이면 같은 밑변과 높이를 가진 평행사변형을 만들 수 있어. 그래서 절반이야.",example:"밑변 8cm, 높이 5cm → 20cm²",memory:"밑변×높이의 절반!"},
    {id:"p5-parallelogram",grade:5,topic:"도형과 측정",title:"평행사변형의 넓이",question:"밑변 a, 높이 h인 평행사변형의 넓이는?",formula:"넓이 = 밑변 × 높이",explain:"평행사변형의 한쪽 삼각형을 옮기면 직사각형으로 바꿔 생각할 수 있어.",example:"밑변 7cm, 높이 4cm → 28cm²",memory:"직사각형처럼 밑변 곱하기 높이!"},
    
    {id:"p6-percent",grade:6,topic:"비와 비율",title:"백분율",question:"비율을 백분율로 나타내는 방법은?",formula:"백분율 = 비율 × 100%",explain:"전체를 100으로 보았을 때 차지하는 정도를 백분율이라고 해. 퍼센트 기호 %를 사용해.",example:"0.25×100%=25%",memory:"비율에 100을 곱해 퍼센트로!"},
    {id:"p6-proportion",grade:6,topic:"비와 비율",title:"비례식의 성질",question:"a:b = c:d일 때 성립하는 식은?",formula:"a × d = b × c",explain:"비례식에서는 바깥쪽 두 항의 곱과 안쪽 두 항의 곱이 같아.",example:"2:3=4:6 → 2×6=3×4",memory:"바깥 곱과 안쪽 곱은 같아!"},
    {id:"p6-circle-circ",grade:6,topic:"원과 입체도형",title:"원의 둘레",question:"반지름 r인 원의 둘레는?",formula:"C = 2πr = πd",explain:"원의 둘레는 지름의 약 3.14배야. 반지름은 지름의 절반이므로 2πr로도 나타낼 수 있어.",example:"반지름 5cm → 둘레 10πcm",memory:"둘레는 지름 곱하기 파이!"},
    {id:"p6-circle-area",grade:6,topic:"원과 입체도형",title:"원의 넓이",question:"반지름 r인 원의 넓이는?",formula:"A = πr²",explain:"원 안에 작은 부채꼴을 많이 만들고 배열하면 밑변이 πr, 높이가 r인 직사각형처럼 생각할 수 있어.",example:"반지름 3cm → 넓이 9πcm²",memory:"반지름을 제곱하고 파이를 곱해!"},
    {id:"p6-prism-volume",grade:6,topic:"원과 입체도형",title:"기둥의 부피",question:"각기둥의 부피를 구하는 방법은?",formula:"부피 = 밑넓이 × 높이",explain:"밑면 모양이 삼각형이든 사각형이든 밑면의 넓이에 높이를 곱하면 돼.",example:"밑넓이 12cm², 높이 5cm → 60cm³",memory:"밑넓이를 높이만큼 쌓아!"},
    {id:"p6-ratio-rate",grade:6,topic:"비와 비율",title:"비율과 기준량",question:"비교하는 양이 a, 기준량이 b일 때 비율은?",formula:"비율 = 비교하는 양 ÷ 기준량",explain:"비율은 기준량에 비해 비교하는 양이 얼마나 되는지를 나타내. 기준량을 1로 보았을 때의 크기야.",example:"3개 ÷ 12개 = 0.25 = 25%",memory:"비교하는 양을 기준량으로 나눠!"},
    
    {id:"m1-prime",grade:7,topic:"수와 연산",title:"소인수분해",question:"자연수를 소수들의 곱으로 나타내는 것을 무엇이라고 할까?",formula:"n = p₁ × p₂ × … × pₖ",explain:"소인수분해는 합성수를 더 이상 나눌 수 없는 소수들의 곱으로 나타내는 거야. 같은 소수는 거듭제곱으로 줄여 쓸 수 있어.",example:"60=2²×3×5",memory:"소수가 될 때까지 나누기!"},
    {id:"m1-gcdlcm",grade:7,topic:"수와 연산",title:"최대공약수와 최소공배수",question:"두 자연수 a, b의 최대공약수와 최소공배수의 곱은?",formula:"최대공약수 × 최소공배수 = a × b",explain:"두 자연수의 소인수분해에서 지수의 작은 쪽을 선택하면 최대공약수, 큰 쪽을 선택하면 최소공배수를 구할 수 있어.",example:"12와 18 → 최대공약수 6, 최소공배수 36",memory:"공약수는 작은 지수, 공배수는 큰 지수!"},
    {id:"m1-distribute",grade:7,topic:"문자와 식",title:"분배법칙",question:"a(b+c)를 전개하면?",formula:"a(b + c) = ab + ac",explain:"괄호 밖의 수를 괄호 안의 모든 항에 각각 곱해. 괄호 앞의 마이너스도 각 항에 적용해야 해.",example:"3(x+2)=3x+6",memory:"괄호 안 항마다 빠짐없이 곱하기!"},
    {id:"m1-linear",grade:7,topic:"문자와 식",title:"일차방정식",question:"ax+b=c (a≠0)를 x에 대해 풀면?",formula:"x = (c − b) ÷ a",explain:"등식의 성질을 이용해 양변에서 b를 빼고 a로 나누면 돼. 양변에 같은 연산을 해야 등식이 유지돼.",example:"2x+3=11 → x=4",memory:"상수항을 옮기고 x의 계수로 나누기!"},
    {id:"m1-poly-angle",grade:7,topic:"도형과 측정",title:"다각형의 내각의 합",question:"n각형의 내각의 합은?",formula:"(n − 2) × 180°",explain:"한 꼭짓점에서 대각선을 그으면 n각형을 n−2개의 삼각형으로 나눌 수 있어.",example:"오각형: (5−2)×180°=540°",memory:"삼각형이 몇 개 생기는지 세어 봐!"},
    {id:"m1-proportion",grade:7,topic:"함수와 그래프",title:"정비례와 반비례",question:"x가 커질 때 y도 같은 비율로 커지는 정비례식은?",formula:"정비례: y=ax · 반비례: y=a/x",explain:"정비례는 y/x가 일정하고, 반비례는 xy가 일정해. a는 0이 아닌 상수야.",example:"y=3x · y=12/x",memory:"정비례는 나눈 값, 반비례는 곱한 값이 일정!"},
    
    {id:"m2-exponent",grade:8,topic:"식의 계산",title:"지수법칙",question:"같은 밑을 가진 거듭제곱을 곱하면?",formula:"aᵐ × aⁿ = aᵐ⁺ⁿ",explain:"밑이 같은 거듭제곱을 곱할 때는 지수끼리 더해. 나눌 때는 지수끼리 빼고, 거듭제곱의 거듭제곱은 지수를 곱해.",example:"x³×x²=x⁵ · (x²)³=x⁶",memory:"곱셈은 더하고, 나눗셈은 빼고, 거듭제곱은 곱하기!"},
    {id:"m2-slope",grade:8,topic:"일차함수",title:"직선의 기울기",question:"두 점 (x₁,y₁), (x₂,y₂)를 지나는 직선의 기울기는?",formula:"기울기 = (y₂ − y₁) / (x₂ − x₁)",explain:"x가 얼마나 변할 때 y가 얼마나 변하는지 나타내는 비율이야. x₂와 x₁은 서로 달라야 해.",example:"(1,2), (3,6) → 기울기 2",memory:"세로 변화량 나누기 가로 변화량!"},
    {id:"m2-linear-function",grade:8,topic:"일차함수",title:"일차함수의 식",question:"기울기가 a이고 y절편이 b인 직선의 식은?",formula:"y = ax + b",explain:"a는 직선의 기울기, b는 y축과 만나는 y좌표야. a가 양수면 오른쪽으로 갈수록 올라가.",example:"기울기 2, y절편 −1 → y=2x−1",memory:"기울기는 x 앞, y절편은 마지막!"},
    {id:"m2-system",grade:8,topic:"연립방정식",title:"연립일차방정식",question:"연립방정식의 해는 두 방정식을 동시에 만족하는 값일까?",formula:"두 식을 모두 참으로 만드는 (x, y)",explain:"가감법에서는 두 식을 더하거나 빼서 한 문자를 없애. 대입법에서는 한 식을 다른 식에 넣어.",example:"x+y=7, x−y=1 → x=4, y=3",memory:"두 방정식을 동시에 만족해야 해!"},
    {id:"m2-pythagoras",grade:8,topic:"도형과 측정",title:"피타고라스 정리",question:"직각삼각형에서 빗변 c와 다른 두 변 a, b의 관계는?",formula:"a² + b² = c²",explain:"직각을 낀 두 변의 제곱의 합은 빗변의 제곱과 같아. c는 가장 긴 변인 빗변이야.",example:"3²+4²=5²",memory:"직각 맞은편 가장 긴 변을 제곱!"},
    {id:"m2-similarity",grade:8,topic:"도형과 측정",title:"닮은 도형의 넓이 비",question:"닮음비가 a:b인 두 도형의 넓이의 비는?",formula:"넓이의 비 = a² : b²",explain:"길이는 닮음비만큼 커지지만 넓이는 가로와 세로가 함께 변하므로 닮음비를 제곱해.",example:"닮음비 2:3 → 넓이의 비 4:9",memory:"길이는 그대로, 넓이는 제곱!"},
    
    {id:"m3-root",grade:9,topic:"제곱근과 실수",title:"제곱근의 곱셈",question:"a, b가 0 이상일 때 √a와 √b의 곱은?",formula:"√a × √b = √(ab)",explain:"제곱근 안의 수끼리 곱할 수 있어. 나눗셈도 분모가 0이 아닐 때 같은 방식으로 정리할 수 있어.",example:"√2×√8=√16=4",memory:"루트끼리 곱하면 안쪽끼리 곱하기!"},
    {id:"m3-square",grade:9,topic:"다항식과 인수분해",title:"완전제곱식",question:"(a+b)²를 전개하면?",formula:"(a + b)² = a² + 2ab + b²",explain:"첫째 항의 제곱, 두 항의 곱의 두 배, 둘째 항의 제곱을 더해.",example:"(x+3)²=x²+6x+9",memory:"제곱 두 개와 가운데 두 배!"},
    {id:"m3-difference",grade:9,topic:"다항식과 인수분해",title:"합차 공식",question:"(a+b)(a−b)를 간단히 하면?",formula:"(a + b)(a − b) = a² − b²",explain:"가운데 항 +ab와 −ab가 서로 없어져서 두 제곱의 차만 남아.",example:"(x+5)(x−5)=x²−25",memory:"더하기와 빼기가 짝이면 제곱의 차!"},
    {id:"m3-factor",grade:9,topic:"다항식과 인수분해",title:"이차식의 인수분해",question:"x²+(p+q)x+pq를 인수분해하면?",formula:"x² + (p+q)x + pq = (x+p)(x+q)",explain:"곱해서 pq, 더해서 p+q가 되는 두 수를 찾으면 돼. 부호까지 확인해야 해.",example:"x²+5x+6=(x+2)(x+3)",memory:"곱은 마지막 항, 합은 가운데 계수!"},
    {id:"m3-quadratic",grade:9,topic:"이차방정식",title:"근의 공식",question:"ax²+bx+c=0 (a≠0)의 해는?",formula:"x = (−b ± √(b²−4ac)) / 2a",explain:"이차방정식의 계수를 a, b, c로 놓고 대입해. 루트 안의 b²−4ac를 판별식이라고 해.",example:"x²−5x+6=0 → x=2 또는 3",memory:"마이너스 b, 플러스마이너스 루트, 분모 2a!"},
    {id:"m3-axis",grade:9,topic:"이차함수",title:"이차함수의 축과 꼭짓점",question:"y=ax²+bx+c의 대칭축은?",formula:"x = −b / 2a",explain:"포물선은 이 직선을 기준으로 좌우 대칭이야. 꼭짓점의 x좌표도 −b/(2a)야.",example:"y=x²−4x+1 → 대칭축 x=2",memory:"축의 x좌표는 −b 나누기 2a!"},
    
    {id:"h1-roots",grade:10,topic:"이차방정식과 함수",title:"이차방정식의 근과 계수",question:"ax²+bx+c=0의 두 근을 α, β라 하면?",formula:"α + β = −b/a · αβ = c/a",explain:"두 근의 합은 x의 계수에 마이너스를 붙여 a로 나눈 값, 곱은 상수항을 a로 나눈 값이야.",example:"x²−5x+6=0 → 합 5, 곱 6",memory:"합은 −b/a, 곱은 c/a!"},
    {id:"h1-discriminant",grade:10,topic:"이차방정식과 함수",title:"판별식",question:"ax²+bx+c=0의 실근 개수를 판별하는 식은?",formula:"D = b² − 4ac",explain:"D가 양수면 서로 다른 두 실근, 0이면 중근, 음수면 실근이 없어.",example:"x²−4x+4=0 → D=0, 중근",memory:"판별식은 b제곱 빼기 4ac!"},
    {id:"h1-distance",grade:10,topic:"좌표와 도형",title:"두 점 사이의 거리",question:"좌표평면의 두 점 A(x₁,y₁), B(x₂,y₂) 사이의 거리는?",formula:"AB = √((x₂−x₁)² + (y₂−y₁)²)",explain:"가로 차이와 세로 차이를 직각삼각형의 두 변으로 보고 피타고라스 정리를 적용해.",example:"(0,0)과 (3,4) 사이의 거리 = 5",memory:"x 차이 제곱, y 차이 제곱, 합의 루트!"},
    {id:"h1-permutation",grade:10,topic:"경우의 수",title:"순열",question:"서로 다른 n개 중 r개를 순서를 고려해 뽑는 수는?",formula:"nPr = n! / (n−r)!",explain:"순열은 뽑힌 순서가 다르면 다른 경우로 세어. n!은 1부터 n까지의 자연수를 모두 곱한 값이야.",example:"5P2=5×4=20",memory:"순서가 중요하면 순열!"},
    {id:"h1-combination",grade:10,topic:"경우의 수",title:"조합",question:"서로 다른 n개 중 r개를 순서 없이 뽑는 수는?",formula:"nCr = n! / (r!(n−r)!)",explain:"조합은 순서를 따지지 않아. 같은 r개를 뽑는 순서만 다른 경우를 하나로 세기 때문에 r!로 나눠.",example:"5C2=10",memory:"순서가 중요하지 않으면 조합!"},
    {id:"h1-matrix",grade:10,topic:"행렬",title:"행렬의 곱셈",question:"행렬 AB의 각 원소는 어떻게 계산할까?",formula:"A의 행과 B의 열을 곱해 더한다",explain:"A가 m×n, B가 n×p 행렬일 때 AB는 m×p 행렬이 돼. 앞 행렬의 열 수와 뒤 행렬의 행 수가 같아야 해.",example:"[1 2] × [3;4] = 11",memory:"왼쪽 행, 오른쪽 열!"},
    
    {id:"h2-exponent",grade:11,topic:"지수와 로그",title:"지수법칙 확장",question:"a가 양수일 때 aᵐ을 aⁿ으로 나누면?",formula:"aᵐ ÷ aⁿ = aᵐ⁻ⁿ",explain:"밑이 같은 거듭제곱의 나눗셈에서는 지수를 빼. 지수는 정수와 유리수까지 확장해 정의할 수 있어.",example:"2⁵÷2²=2³=8",memory:"곱하면 더하고, 나누면 빼기!"},
    {id:"h2-log",grade:11,topic:"지수와 로그",title:"로그의 곱셈 법칙",question:"로그 안의 곱 xy를 나누어 쓰면?",formula:"logₐ(xy) = logₐx + logₐy",explain:"로그의 진수의 곱은 로그의 합으로 바꿀 수 있어. 밑 a는 양수이고 1이 아니며, x와 y는 양수야.",example:"log₂(8×4)=log₂8+log₂4=5",memory:"진수의 곱은 로그의 덧셈!"},
    {id:"h2-change-base",grade:11,topic:"지수와 로그",title:"로그의 밑 변환",question:"logₐb를 자연로그나 상용로그로 바꾸면?",formula:"logₐb = log b / log a",explain:"밑을 원하는 값으로 바꾸어 계산할 수 있어. 분자와 분모의 로그 밑은 서로 같아야 해.",example:"log₂8=log8/log2=3",memory:"구하려는 수가 위, 원래 밑이 아래!"},
    {id:"h2-trig",grade:11,topic:"삼각함수",title:"삼각함수의 기본 항등식",question:"모든 실수 θ에 대해 성립하는 기본 관계는?",formula:"sin²θ + cos²θ = 1",explain:"단위원의 좌표를 (cosθ, sinθ)로 보면 피타고라스 정리에서 바로 나오는 식이야.",example:"cosθ=3/5이면 sin²θ=16/25",memory:"사인 제곱 더하기 코사인 제곱은 1!"},
    {id:"h2-arithmetic",grade:11,topic:"수열",title:"등차수열의 일반항과 합",question:"첫째항 a, 공차 d인 등차수열의 n번째 항은?",formula:"aₙ = a + (n−1)d",explain:"첫째항에서 공차를 n−1번 더하면 n번째 항이 돼. 첫 n개 항의 합은 n(첫째항+끝항)/2야.",example:"2,5,8,… → a₁₀=29",memory:"첫째항에 공차를 n−1번 더해!"},
    {id:"h2-geometric",grade:11,topic:"수열",title:"등비수열의 일반항과 합",question:"첫째항 a, 공비 r인 등비수열의 n번째 항은?",formula:"aₙ = arⁿ⁻¹",explain:"항마다 같은 수 r을 곱하는 수열이야. r≠1일 때 첫 n개 항의 합은 a(rⁿ−1)/(r−1)이야.",example:"3,6,12,… → a₅=48",memory:"등비는 공비를 n−1번 곱하기!"},
    
    {id:"h3-derivative",grade:12,topic:"미분",title:"거듭제곱의 미분",question:"xⁿ을 미분하면?",formula:"d/dx (xⁿ) = nxⁿ⁻¹",explain:"지수 n을 앞으로 내려 곱하고, 지수는 1 작아져. 다항함수의 각 항을 따로 미분할 수 있어.",example:"f(x)=3x⁴ → f′(x)=12x³",memory:"지수 앞으로, 지수 하나 빼기!"},
    {id:"h3-product-rule",grade:12,topic:"미분",title:"곱의 미분법",question:"두 함수 f(x), g(x)의 곱을 미분하면?",formula:"(fg)′ = f′g + fg′",explain:"첫 번째 함수의 미분×두 번째 함수 + 첫 번째 함수×두 번째 함수의 미분이야.",example:"(x²·sin x)′=2x sin x+x² cos x",memory:"앞 미분×뒤 + 앞×뒤 미분!"},
    {id:"h3-integral",grade:12,topic:"적분",title:"거듭제곱의 부정적분",question:"xⁿ을 부정적분하면? (n≠−1)",formula:"∫xⁿ dx = xⁿ⁺¹/(n+1) + C",explain:"지수에 1을 더하고, 그 수로 나눠. 미분하면 원래 함수가 되므로 적분상수 C를 꼭 붙여.",example:"∫x²dx=x³/3+C",memory:"지수 하나 더하고, 새 지수로 나누기!"},
    {id:"h3-definite-integral",grade:12,topic:"적분",title:"정적분과 넓이",question:"F′(x)=f(x)일 때 a부터 b까지 정적분은?",formula:"∫ₐᵇ f(x)dx = F(b) − F(a)",explain:"원시함수 F를 구한 뒤 위끝 b를 대입한 값에서 아래끝 a를 대입한 값을 빼면 돼.",example:"∫₀² 2x dx = [x²]₀² = 4",memory:"위끝 넣고 아래끝 넣은 값을 빼기!"},
    {id:"h3-conditional",grade:12,topic:"확률과 통계",title:"조건부확률",question:"B가 일어났다는 조건에서 A가 일어날 확률은?",formula:"P(A|B) = P(A∩B) / P(B)",explain:"B가 일어났다는 정보가 주어졌으므로 전체 기준이 P(B)로 바뀌어. P(B)는 0보다 커야 해.",example:"P(A∩B)=0.2, P(B)=0.5 → P(A|B)=0.4",memory:"조건이 된 사건이 분모!"},
    {id:"h3-expectation",grade:12,topic:"확률과 통계",title:"확률변수의 기댓값",question:"확률변수 X의 기댓값을 구하는 방법은?",formula:"E(X) = Σ x·P(X=x)",explain:"나올 수 있는 값에 그 값이 나올 확률을 곱한 뒤 모두 더해. 장기적으로 기대할 수 있는 평균값이야.",example:"0점(0.2), 10점(0.8) → E(X)=8",memory:"값 곱하기 확률을 전부 더해!"},
    {id:"h3-vector",grade:12,topic:"기하와 벡터",title:"벡터의 내적",question:"벡터 a, b의 크기와 끼인각 θ로 내적을 나타내면?",formula:"a · b = |a||b|cosθ",explain:"내적은 두 벡터의 방향이 얼마나 비슷한지 나타내는 값이야. 좌표로는 대응하는 성분끼리 곱해 더해.",example:"(1,2)·(3,4)=1×3+2×4=11",memory:"크기 곱하기 크기 곱하기 코사인!"},
    {id:"h3-normal",grade:12,topic:"확률과 통계",title:"정규분포의 표준화",question:"평균 μ, 표준편차 σ인 값 x를 표준화하면?",formula:"z = (x − μ) / σ",explain:"평균에서 얼마나 떨어져 있는지를 표준편차 단위로 나타내. 표준화한 정규분포는 평균 0, 표준편차 1이야.",example:"평균 70, 표준편차 10, 점수 80 → z=1",memory:"평균을 빼고 표준편차로 나누기!"}
  ];
})();