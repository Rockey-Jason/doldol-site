/* ROCKEY STUDY · EXPANDED MATHEMATICS COURSE + SAFE EXPRESSION ENGINE
   Expressions are parsed and numerically checked; user input is never eval()'d. */
(function () {
  "use strict";

  var course = window.ROCKEY_FORMULA_COURSE;
  if (!Array.isArray(course)) return;

  function F(id, grade, topic, title, question, formula, explain, example, memory, answer) {
    return {id:id,grade:grade,topic:topic,title:title,question:question,formula:formula,explain:explain,example:example,memory:memory,answer:answer};
  }

  var answers = {
    "p1-order":"11;13",
    "p1-ten":"8+2=10",
    "p1-add":"3+4=7",
    "p1-sub":"9-4=5",
    "p1-compare":"9>6",
    "p1-time":"60",
    "p2-place":"10*a+b",
    "p2-times":"3+3+3+3=3*4",
    "p2-divide":"12/3=4",
    "p2-inverse":"b=c/a",
    "p2-length":"100",
    "p2-calendar":"24",
    "p3-multiply":"a*b=b*a",
    "p3-remainder":"a=b*q+r",
    "p3-rect-perimeter":"2*(w+h)",
    "p3-square-perimeter":"4*s",
    "p3-fraction":"3/5",
    "p3-km":"1000",
    "p4-ten-thousand":"10000",
    "p4-triangle-angle":"A+B+C=180",
    "p4-angle":"180;360",
    "p4-rect-area":"w*h",
    "p4-decimal":"0.1=1/10;0.01=1/100",
    "p4-area-unit":"100",
    "p5-fraction-eq":"a/b=(a*n)/(b*n)",
    "p5-fraction-add":"a/b+c/d=(a*d+b*c)/(b*d)",
    "p5-fraction-mul":"(a/b)*(c/d)=(a*c)/(b*d)",
    "p5-decimal-mul":"m+n",
    "p5-triangle-area":"b*h/2",
    "p5-parallelogram":"b*h",
    "p6-percent":"100*r",
    "p6-proportion":"a*d=b*c",
    "p6-circle-circ":["2*pi*r","pi*d"],
    "p6-circle-area":"pi*r^2",
    "p6-prism-volume":"B*h",
    "p6-ratio-rate":"a/b",
    "m1-prime":"2^2*3*5",
    "m1-gcdlcm":"g*l=a*b",
    "m1-distribute":"a*(b+c)=a*b+a*c",
    "m1-linear":"x=(c-b)/a",
    "m1-poly-angle":"(n-2)*180",
    "m1-proportion":"y=a*x;y=a/x",
    "m2-exponent":"a^m*a^n=a^(m+n)",
    "m2-slope":"(y_2-y_1)/(x_2-x_1)",
    "m2-linear-function":"y=a*x+b",
    "m2-system":"x=4;y=3",
    "m2-pythagoras":"a^2+b^2=c^2",
    "m2-similarity":"a^2/b^2",
    "m3-root":"sqrt(a)*sqrt(b)=sqrt(a*b)",
    "m3-square":"(a+b)^2=a^2+2*a*b+b^2",
    "m3-difference":"(a+b)*(a-b)=a^2-b^2",
    "m3-factor":"(x+p)*(x+q)=x^2+(p+q)*x+p*q",
    "m3-quadratic":["x=(-b+sqrt(b^2-4*a*c))/(2*a)","x=(-b-sqrt(b^2-4*a*c))/(2*a)"],
    "m3-axis":"-b/(2*a)",
    "h1-roots":"alpha+beta=-b/a;alpha*beta=c/a",
    "h1-discriminant":"b^2-4*a*c",
    "h1-distance":"sqrt((x_2-x_1)^2+(y_2-y_1)^2)",
    "h1-permutation":"n!/(n-r)!",
    "h1-combination":"n!/(r!*(n-r)!)",
    "h1-matrix":"a*e+b*g",
    "h2-exponent":"a^m/a^n=a^(m-n)",
    "h2-log":"log(x*y)=log(x)+log(y)",
    "h2-change-base":"log(b)/log(a)",
    "h2-trig":"sin(theta)^2+cos(theta)^2=1",
    "h2-arithmetic":"a_n=a_1+(n-1)*d",
    "h2-geometric":"a_n=a_1*r^(n-1)",
    "h3-derivative":"n*x^(n-1)",
    "h3-product-rule":"u*g+f*v",
    "h3-integral":"x^(n+1)/(n+1)+C",
    "h3-definite-integral":"F(b)-F(a)",
    "h3-conditional":"p_ab/p_b",
    "h3-expectation":"x_1*p_1+x_2*p_2",
    "h3-vector":"a_x*b_x+a_y*b_y",
    "h3-normal":"(x-mu)/sigma"
  };

  var overrides = {
    "p2-inverse":"곱셈식 a×b=c에서 b를 구하는 식을 입력해.",
    "p3-rect-perimeter":"가로가 w, 세로가 h인 직사각형의 둘레를 식으로 입력해.",
    "p3-square-perimeter":"한 변의 길이가 s인 정사각형의 둘레를 식으로 입력해.",
    "p3-remainder":"나누어지는 수 a, 나누는 수 b, 몫 q, 나머지 r의 관계식을 입력해.",
    "p4-angle":"평각과 한 바퀴의 각을 차례대로 입력해. 쉼표나 세미콜론으로 구분해도 돼.",
    "p5-decimal-mul":"두 수의 소수 자릿수가 각각 m, n일 때 곱의 소수 자릿수를 식으로 입력해.",
    "m1-prime":"60을 소인수분해한 식을 입력해.",
    "m1-gcdlcm":"두 자연수 a, b의 최대공약수를 g, 최소공배수를 l이라 할 때 관계식을 입력해.",
    "m1-proportion":"정비례와 반비례의 식을 차례대로 입력해. 세미콜론으로 구분해.",
    "m2-system":"연립방정식 x+y=7, x−y=1의 해를 x, y 순서대로 입력해. 예: x=4; y=3",
    "m2-similarity":"닮음비 a:b인 도형의 넓이의 비를 분수식으로 입력해.",
    "h1-matrix":"A=[[a,b],[c,d]], B=[[e,f],[g,h]]일 때 AB의 왼쪽 위 원소를 입력해.",
    "h2-arithmetic":"첫째항 a_1, 공차 d인 등차수열의 n번째 항을 입력해.",
    "h2-geometric":"첫째항 a_1, 공비 r인 등비수열의 n번째 항을 입력해.",
    "h3-product-rule":"f'=u, g'=v일 때 곱의 미분법을 입력해.",
    "h3-expectation":"두 값 x_1, x_2와 확률 p_1, p_2를 갖는 확률변수의 기댓값을 입력해."
  };

  course.forEach(function (card) {
    if (Object.prototype.hasOwnProperty.call(answers, card.id)) card.answer = answers[card.id];
    if (Object.prototype.hasOwnProperty.call(overrides, card.id)) card.question = overrides[card.id];
    if (card.id === "p4-angle") card.formula = "평각 = 180° · 한 바퀴 = 360°";
    if (card.id === "p4-decimal") card.formula = "0.1 = 1/10 · 0.01 = 1/100";
    if (card.id === "p5-decimal-mul") card.formula = "곱의 소수 자릿수 = m + n";
    if (card.id === "m2-system") card.formula = "x = 4 · y = 3";
    if (card.id === "h1-matrix") card.formula = "ae + bg";
    if (card.id === "h3-product-rule") card.formula = "u·g + f·v";
  });

  var additions = [
    F("p1-add-commute",1,"덧셈과 뺄셈","덧셈의 순서 바꾸기","3+5와 5+3의 결과가 같다는 식을 입력해.","a + b = b + a","덧셈은 더하는 수의 순서를 바꾸어도 합이 같아.","3+5=5+3=8","덧셈은 순서를 바꿔도 같아!","a+b=b+a"),
    F("p1-add-zero",1,"덧셈과 뺄셈","0 더하기","어떤 수 a에 0을 더하면?","a + 0 = a","0은 더해도 원래 수가 변하지 않아.","7+0=7","0은 더해도 그대로!","a+0=a"),
    F("p1-sub-zero",1,"덧셈과 뺄셈","0 빼기","어떤 수 a에서 0을 빼면?","a − 0 = a","아무것도 빼지 않으면 원래 수 그대로야.","9−0=9","빼는 수가 0이면 그대로!","a-0=a"),
    F("p1-double",1,"덧셈과 뺄셈","두 배 만들기","어떤 수 a의 두 배를 곱셈으로 나타내면?","2 × a","같은 수를 두 번 더하는 것은 2를 곱하는 것과 같아.","6+6=2×6=12","두 번이면 2배!","2*a"),
    F("p1-half",1,"덧셈과 뺄셈","반으로 나누기","어떤 수 a를 똑같이 2개로 나눈 한 몫은?","a ÷ 2","똑같이 둘로 나누면 각각 전체의 절반이 돼.","10÷2=5","절반은 2로 나누기!","a/2"),

    F("p2-place-three",2,"수 감각","세 자리 수 나타내기","백의 자리 a, 십의 자리 b, 일의 자리 c인 세 자리 수를 식으로 입력해.","100a + 10b + c","각 자리 숫자에 자리의 크기를 곱해 더하면 세 자리 수가 돼.","352=100×3+10×5+2","백·십·일의 자리값을 더해!","100*a+10*b+c"),
    F("p2-times-zero",2,"곱셈과 나눗셈","0을 곱하면","어떤 수 a에 0을 곱하면?","a × 0 = 0","어떤 수든 0묶음은 아무것도 없는 것과 같아.","8×0=0","0을 곱하면 언제나 0!","a*0=0"),
    F("p2-times-one",2,"곱셈과 나눗셈","1을 곱하면","어떤 수 a에 1을 곱하면?","a × 1 = a","한 묶음은 원래 수와 같아.","9×1=9","1을 곱하면 그대로!","a*1=a"),
    F("p2-ten-multiple",2,"곱셈과 나눗셈","10의 배수","어떤 자연수 n에 10을 곱한 식은?","10 × n","10을 곱하면 십의 자리 이상으로 한 자리씩 이동해.","23×10=230","10배는 자릿값 한 칸!","10*n"),
    F("p2-hour-minute",2,"생활 속 수학","분과 초","1분은 몇 초일까?","1분 = 60초","분과 초는 60을 기준으로 바뀌는 시간 단위야.","3분=180초","1분은 60초!","60"),

    F("p3-distribute",3,"곱셈과 나눗셈","곱셈의 분배","3×(4+2)를 분배법칙으로 나타내면?","a(b + c) = ab + ac","괄호 안의 두 수에 각각 곱하면 계산이 쉬워져.","3×(4+2)=3×4+3×2","괄호 안의 두 항 모두 곱하기!","a*(b+c)=a*b+a*c"),
    F("p3-division-check",3,"곱셈과 나눗셈","나눗셈 검산","나눗셈에서 나누어지는 수를 구하는 식은?","나누는 수×몫+나머지","나누는 수와 몫을 곱한 뒤 나머지를 더하면 처음 수가 돼.","23=5×4+3","곱하고 나머지를 더해!","b*q+r"),
    F("p3-fraction-unit",3,"분수","단위분수","분자가 1인 분수를 무엇이라고 할까?","1/n","전체를 n등분한 것 중 한 조각을 단위분수라고 해.","1/4, 1/7, 1/10","분자가 1이면 단위분수!","1/n"),
    F("p3-length-cm-mm",3,"도형과 측정","센티미터와 밀리미터","1cm는 몇 mm일까?","1cm = 10mm","1cm를 10개의 같은 길이로 나누면 1mm야.","4cm=40mm","센티미터 하나에 10밀리미터!","10"),
    F("p3-perimeter",3,"도형과 측정","다각형의 둘레","도형의 둘레를 구하는 일반적인 방법은?","모든 변의 길이의 합","둘레는 도형의 테두리를 한 바퀴 돈 길이야.","삼각형 둘레=a+b+c","변의 길이를 전부 더해!","a+b+c"),

    F("p4-square-area",4,"도형과 측정","정사각형의 넓이","한 변이 s인 정사각형의 넓이를 입력해.","s × s","정사각형은 가로와 세로가 모두 s이므로 s를 두 번 곱해.","한 변 5cm → 25cm²","한 변의 제곱!","s^2"),
    F("p4-rectangle-perimeter",4,"도형과 측정","직사각형의 둘레","가로 w, 세로 h인 직사각형의 둘레는?","2(w + h)","가로와 세로가 각각 두 번씩 있어.","w=6, h=4 → 20","가로와 세로의 합을 두 배!","2*(w+h)"),
    F("p4-parallel-area",4,"도형과 측정","평행사변형의 넓이","밑변 b, 높이 h인 평행사변형의 넓이는?","b × h","평행사변형을 잘라 옮기면 같은 밑변과 높이의 직사각형으로 볼 수 있어.","b=7, h=3 → 21","밑변 곱하기 높이!","b*h"),
    F("p4-fraction-add-same",4,"분수와 소수","분모가 같은 분수의 덧셈","분모가 같은 두 분수를 더하는 식은?","a/c + b/c = (a+b)/c","같은 크기의 조각이므로 분자끼리 더하고 분모는 그대로 둬.","1/5+2/5=3/5","분모는 그대로, 분자끼리 더하기!","a/c+b/c=(a+b)/c"),
    F("p4-fraction-sub-same",4,"분수와 소수","분모가 같은 분수의 뺄셈","분모가 같은 두 분수를 빼는 식은?","a/c − b/c = (a−b)/c","같은 크기의 조각끼리 빼는 것이므로 분자끼리 빼.","4/7−2/7=2/7","분모는 그대로, 분자끼리 빼기!","a/c-b/c=(a-b)/c"),
    F("p4-decimal-place",4,"분수와 소수","소수 첫째 자리","소수 첫째 자리에 놓이는 단위분수는?","1/10","소수점 바로 오른쪽 첫 자리는 10분의 1의 자리야.","0.6=6/10","소수 첫째 자리는 10분의 1!","1/10"),
    F("p4-perimeter-square",4,"도형과 측정","정사각형의 둘레와 넓이","한 변이 s인 정사각형의 둘레와 넓이를 순서대로 입력해.","4s, s²","네 변을 더하면 둘레, 한 변을 두 번 곱하면 넓이야.","s=4 → 둘레 16, 넓이 16","둘레는 네 배, 넓이는 제곱!","4*s;s^2"),

    F("p5-fraction-div",5,"분수와 소수","분수의 나눗셈","a/b를 c/d로 나누는 식을 역수의 곱으로 나타내면?","(a/b) ÷ (c/d) = (a/b) × (d/c)","나누는 분수의 분자와 분모를 바꾼 역수를 곱해.","2/3÷4/5=2/3×5/4","나눗셈은 나누는 수의 역수를 곱하기!","(a/b)/(c/d)=(a*d)/(b*c)"),
    F("p5-fraction-sub",5,"분수와 소수","분모가 다른 분수의 뺄셈","분모가 다른 두 분수를 뺄 때 가장 먼저 하는 것은?","통분","공통분모로 바꾸면 같은 크기의 조각끼리 뺄 수 있어.","3/4−1/6=9/12−2/12=7/12","먼저 통분!","a/b-c/d=(a*d-b*c)/(b*d)"),
    F("p5-mixed",5,"분수와 소수","대분수와 가분수","정수 n과 분수 a/b를 합친 대분수를 가분수로 나타내면?","(n×b+a)/b","정수 부분을 분모가 b인 분수로 바꾼 뒤 분자를 더해.","2 1/3=7/3","정수 곱하기 분모 더하기 분자!","(n*b+a)/b"),
    F("p5-decimal-div",5,"분수와 소수","소수의 나눗셈","a÷b에서 나누는 수 b를 10배 하면 나누어지는 수도 어떻게 해야 할까?","a/b = (10a)/(10b)","나누는 수와 나누어지는 수에 같은 수를 곱해도 몫은 변하지 않아.","3.6÷0.4=36÷4","둘 다 같은 배수로 바꾸기!","a/b=(10*a)/(10*b)"),
    F("p5-trapezoid-area",5,"도형과 측정","사다리꼴의 넓이","윗변 a, 아랫변 b, 높이 h인 사다리꼴의 넓이는?","(a+b)h/2","같은 사다리꼴 두 개를 붙이면 평행사변형이 되므로 절반이야.","a=3,b=7,h=4 → 20","평행한 두 변의 합 곱하기 높이 나누기 2!","(a+b)*h/2"),
    F("p5-rect-prism-volume",5,"도형과 측정","직육면체의 부피","가로 a, 세로 b, 높이 h인 직육면체의 부피는?","a × b × h","밑면의 넓이 a×b를 높이만큼 쌓는다고 생각해.","2×3×4=24","가로×세로×높이!","a*b*h"),
    F("p5-average",5,"자료와 가능성","평균","자료 n개의 평균을 구하는 식은?","자료의 합 ÷ 자료의 개수","모든 자료를 똑같이 나누어 가진 값이 평균이야.","2,4,6의 평균은 4","모두 더하고 개수로 나누기!","S/n"),
    F("p5-speed",5,"생활 속 수학","속력","이동 거리 d, 걸린 시간 t일 때 속력은?","속력 = 거리 ÷ 시간","같은 시간 동안 얼마나 이동했는지를 나타내.","100m를 20초 → 5m/s","거리 나누기 시간!","d/t"),

    F("p6-ratio",6,"비와 비율","비의 값","a:b라는 비의 값은?","a/b","비의 앞 항을 뒤 항으로 나누면 비의 값이 돼.","3:4의 비의 값은 3/4","앞 항 나누기 뒤 항!","a/b"),
    F("p6-percent-number",6,"비와 비율","백분율 구하기","전체 T 중 일부 P의 백분율은?","(P/T) × 100%","일부를 전체로 나누고 100을 곱해.","15/60×100%=25%","부분 나누기 전체 곱하기 100!","100*P/T"),
    F("p6-cylinder-volume",6,"원과 입체도형","원기둥의 부피","반지름 r, 높이 h인 원기둥의 부피는?","πr²h","밑면인 원의 넓이에 높이를 곱해.","r=2,h=5 → 20π","원 넓이 곱하기 높이!","pi*r^2*h"),
    F("p6-cylinder-surface",6,"원과 입체도형","원기둥의 겉넓이","반지름 r, 높이 h인 원기둥의 겉넓이는?","2πr² + 2πrh","위아래 원 두 개와 옆면을 펼친 직사각형의 넓이를 더해.","r=2,h=3 → 20π","원 두 개와 옆면!","2*pi*r^2+2*pi*r*h"),
    F("p6-circle-diameter",6,"원과 입체도형","원의 지름","반지름 r인 원의 지름은?","d = 2r","지름은 원의 중심을 지나 양쪽 끝을 잇는 선분이야.","r=4 → d=8","반지름의 두 배!","2*r"),
    F("p6-prism-surface",6,"원과 입체도형","각기둥의 부피","밑넓이 B, 높이 h인 각기둥의 부피는?","B × h","밑면 모양과 관계없이 밑넓이에 높이를 곱해.","B=12,h=5 → 60","밑넓이 곱하기 높이!","B*h"),
    F("p6-unit-rate",6,"비와 비율","단위량","비교하는 양 P, 기준량 T일 때 단위량은?","P/T","기준량 1에 대한 비교하는 양의 크기야.","12개/3명=4개/명","기준량을 1로 만들기!","P/T"),

    F("m1-integer-add",7,"정수와 유리수","정수의 덧셈","정수 a와 b를 더한 결과는?","a + b","부호가 같으면 절댓값을 더하고 공통 부호를, 다르면 절댓값을 빼고 큰 쪽 부호를 사용해.","−3+8=5","부호와 절댓값을 나누어 생각!","a+b"),
    F("m1-integer-mul",7,"정수와 유리수","정수의 곱셈 부호","서로 다른 부호의 두 정수 곱의 부호를 입력해. (+1은 양수, −1은 음수)","음수","부호가 다른 두 수를 곱하면 음수, 같은 부호끼리 곱하면 양수야.","(−3)×5=−15","같은 부호 양수, 다른 부호 음수!","-1"),
    F("m1-rational-mul",7,"정수와 유리수","유리수의 곱셈","두 분수 a/b와 c/d의 곱은?","ac/bd","분자는 분자끼리, 분모는 분모끼리 곱해.","2/3×3/5=2/5","위끼리, 아래끼리!","(a*c)/(b*d)"),
    F("m1-rational-div",7,"정수와 유리수","유리수의 나눗셈","a/b를 c/d로 나누는 식은?","ad/bc","나누는 분수의 역수를 곱하면 돼.","2/3÷4/5=5/6","나누는 분수 뒤집어 곱하기!","(a*d)/(b*c)"),
    F("m1-order-ops",7,"정수와 유리수","연산의 우선순위","3×(4+2)에서 가장 먼저 계산하는 괄호 안의 값을 입력해.","괄호","괄호 안을 먼저 계산하고 거듭제곱, 곱셈·나눗셈, 덧셈·뺄셈 순서로 계산해.","3×(4+2)=18","괄호부터!","6"),
    F("m1-exponent-zero",7,"문자와 식","0의 거듭제곱","a≠0일 때 a의 0제곱은?","a⁰ = 1","0이 아닌 수의 0제곱은 1로 정의해.","5⁰=1","0이 아닌 밑의 0제곱은 1!","a^0"),
    F("m1-exponent-negative",7,"문자와 식","음의 정수 지수","a≠0일 때 a의 −n제곱은?","a⁻ⁿ = 1/aⁿ","음의 지수는 역수의 양의 지수로 바꿀 수 있어.","2⁻³=1/8","마이너스 지수는 뒤집기!","1/a^n"),
    F("m1-linear-term",7,"문자와 식","동류항 계산","동류항 ax와 bx를 더하면?","(a+b)x","문자와 차수가 같은 항은 계수끼리 더해.","3x+5x=8x","문자가 같으면 계수 계산!","(a+b)*x"),
    F("m1-equation-balance",7,"문자와 식","등식의 성질","등식 양변에 같은 수를 더해도 등식은 유지될까?","a=b ⇒ a+c=b+c","등식 양변에 같은 수를 더하거나 빼도 등식은 성립해.","x+2=5 → x=3","양변에 똑같이!","a+c=b+c"),
    F("m1-triangle-exterior",7,"기하","삼각형의 외각","삼각형의 한 외각은 나머지 두 내각의 합과 같아?","외각 = 두 내각의 합","외각과 이웃한 내각은 180°를 이루므로 나머지 두 각의 합과 같아.","외각 120°=내각 50°+70°","외각은 떨어진 두 내각의 합!","a+b"),
    F("m1-polygon-exterior",7,"기하","다각형의 외각의 합","볼록다각형의 외각의 합은?","360°","각 꼭짓점에서 한 방향으로 한 바퀴 회전한 양과 같아.","오각형도 360°","외각의 합은 언제나 360도!","360"),
    F("m1-circle-arc",7,"기하","원주율","원의 둘레를 지름으로 나눈 값은?","π = C/d","원주율은 모든 원에서 같은 값으로 약 3.14159야.","C=πd","둘레 나누기 지름!","pi"),

    F("m2-polynomial-add",8,"다항식","다항식의 덧셈","(a+b)+(c+d)를 정리하면?","a+b+c+d","괄호를 풀고 동류항을 모으면 돼.","(2x+3)+(x−1)=3x+2","괄호를 풀고 동류항 모으기!","a+b+c+d"),
    F("m2-polynomial-mul",8,"다항식","단항식과 다항식의 곱","a(b+c)를 전개하면?","ab+ac","분배법칙을 이용해 괄호 안의 각 항에 곱해.","2x(x+3)=2x²+6x","각 항마다 곱하기!","a*b+a*c"),
    F("m2-square-sum",8,"다항식","두 일차식의 곱","(x+a)(x+b)를 전개하면?","x²+(a+b)x+ab","각 항을 빠짐없이 곱한 뒤 동류항을 정리해.","(x+2)(x+3)=x²+5x+6","바깥·안쪽 항도 곱하기!","x^2+(a+b)*x+a*b"),
    F("m2-linear-equation",8,"연립방정식","일차방정식의 해","ax+b=c (a≠0)의 해 x를 입력해.","x=(c−b)/a","양변에서 b를 빼고 a로 나누면 돼.","2x+3=11 → x=4","상수항을 정리하고 계수로 나누기!","(c-b)/a"),
    F("m2-system-add",8,"연립방정식","가감법의 원리","두 식을 더하거나 빼서 한 문자를 없애는 방법은?","가감법","계수의 합이나 차가 0이 되도록 식을 더하거나 빼.","x+y=7, x−y=1","한 문자의 계수를 서로 반대로!","(x+y)+(x-y)"),
    F("m2-function-value",8,"일차함수","함숫값","f(x)=ax+b일 때 f(t)는?","at+b","함수식의 x 자리에 t를 대입해.","f(x)=2x+1이면 f(3)=7","x 자리에 입력값 넣기!","a*t+b"),
    F("m2-line-intercept",8,"일차함수","y절편","y=ax+b에서 y절편은?","b","x=0일 때 y=b이므로 y축과 만나는 값은 b야.","y=3x+2의 y절편은 2","마지막 상수항!","b"),
    F("m2-slope-intercept",8,"일차함수","일차함수의 기울기와 절편","y=ax+b에서 기울기와 y절편을 순서대로 적어.","a, b","x의 계수 a가 기울기이고 상수항 b가 y절편이야.","y=2x−3 → 2,−3","x의 계수, 상수항 순서!","a;b"),
    F("m2-triangle-sum",8,"기하","삼각형의 내각","삼각형 세 내각의 합은?","180°","삼각형의 세 내각을 합하면 평각과 같아.","40°+60°+80°=180°","삼각형은 180도!","180"),
    F("m2-quad-sum",8,"기하","사각형의 내각","사각형 네 내각의 합은?","360°","대각선 하나로 두 삼각형을 만들 수 있으므로 180° 두 개야.","직사각형 90°×4=360°","사각형은 360도!","360"),
    F("m2-probability",8,"확률과 통계","확률의 기본식","모든 경우가 같은 가능성일 때 유리한 경우의 수 m, 전체 경우의 수 n이면 확률은?","m/n","확률은 원하는 경우가 전체에서 차지하는 비율이야.","주사위 짝수 확률=3/6=1/2","유리한 경우 나누기 전체 경우!","m/n"),
    F("m2-pythagoras-distance",8,"기하","직각삼각형의 빗변","직각삼각형의 두 직각변 a,b로 빗변 c를 나타내면?","sqrt(a²+b²)","피타고라스 정리에서 양변에 제곱근을 취하면 돼.","3,4,5 삼각형","두 변 제곱 합의 제곱근!","sqrt(a^2+b^2)"),
    F("m2-circle-area",8,"기하","원의 넓이 심화","반지름 r인 원의 넓이는?","πr²","반지름의 제곱에 원주율을 곱해.","r=4 → 16π","반지름 제곱 곱하기 파이!","pi*r^2"),
    F("m2-parallel-angle",8,"기하","평행선의 동위각","두 평행선을 한 직선이 자를 때 동위각의 크기는?","같다","평행선에서 동위각과 엇각은 서로 같아.","한 각이 65°면 동위각도 65°","동위각은 같다!","a=b"),

    F("m3-root-div",9,"제곱근과 실수","제곱근의 나눗셈","a≥0, b>0일 때 √a/√b는?","sqrt(a/b)","제곱근의 나눗셈은 루트 안에서 나눌 수 있어.","√12/√3=2","루트끼리 나누면 안쪽끼리!","sqrt(a/b)"),
    F("m3-root-square",9,"제곱근과 실수","제곱근의 제곱","a≥0일 때 (√a)²은?","a","제곱근을 제곱하면 루트 안의 수가 돼.","(√7)²=7","루트와 제곱은 서로 되돌리기!","a"),
    F("m3-multiply-conjugate",9,"다항식과 인수분해","합차 곱셈","(a+b)(a−b)의 결과는?","a²−b²","중간의 +ab와 −ab가 서로 없어져.","(x+4)(x−4)=x²−16","두 제곱의 차!","a^2-b^2"),
    F("m3-factor-common",9,"다항식과 인수분해","공통인수로 묶기","ab+ac를 인수분해하면?","a(b+c)","모든 항에 공통으로 있는 a를 괄호 밖으로 꺼내.","3x+6=3(x+2)","공통으로 있는 인수 찾기!","a*(b+c)"),
    F("m3-factor-perfect-minus",9,"다항식과 인수분해","완전제곱식의 차","(a−b)²를 전개하면?","a²−2ab+b²","두 항의 제곱을 더하고 곱의 두 배를 빼.","(x−3)²=x²−6x+9","가운데 항은 마이너스 두 배!","a^2-2*a*b+b^2"),
    F("m3-quadratic-discriminant",9,"이차방정식","판별식과 실근","D=b²−4ac일 때 서로 다른 두 실근을 갖는 조건은?","D>0","판별식이 양수면 제곱근 안이 양수라 서로 다른 두 근이 나와.","x²−5x+6=0 → D=1","두 실근은 D가 양수!","b^2-4*a*c>0"),
    F("m3-quadratic-double",9,"이차방정식","중근의 조건","이차방정식이 중근을 가질 조건은?","D=0","판별식이 0이면 근의 공식에서 ± 뒤의 값이 0이 돼.","x²−4x+4=0","중근이면 판별식 0!","b^2-4*a*c=0"),
    F("m3-quadratic-no-real",9,"이차방정식","허근의 조건","이차방정식이 실근을 갖지 않는 조건은?","D<0","판별식이 음수이면 실수 범위에서 제곱근을 계산할 수 없어.","x²+1=0","실근이 없으면 판별식 음수!","b^2-4*a*c<0"),
    F("m3-vertex",9,"이차함수","이차함수 꼭짓점의 x좌표","y=ax²+bx+c의 꼭짓점 x좌표는?","−b/(2a)","대칭축의 x좌표와 꼭짓점의 x좌표는 같아.","y=x²−4x+1 → x=2","마이너스 b 나누기 2a!","-b/(2*a)"),
    F("m3-trig-sin",9,"삼각비","사인","직각삼각형에서 맞은편 변을 p, 빗변을 h로 두면 sin θ는?","높이/빗변","sin은 각 θ의 맞은편 변을 빗변으로 나눈 비율이야.","sin 30°=1/2","맞은편 나누기 빗변!","p/h"),
    F("m3-trig-cos",9,"삼각비","코사인","직각삼각형에서 각 θ에 이웃한 변을 a, 빗변을 h로 두면 cos θ는?","밑변/빗변","cos는 각 θ에 붙어 있는 변을 빗변으로 나눈 비율이야.","cos 60°=1/2","이웃한 변 나누기 빗변!","a/h"),
    F("m3-trig-tan",9,"삼각비","탄젠트","직각삼각형에서 맞은편 변을 p, 이웃한 변을 a로 두면 tan θ는?","높이/밑변","tan은 맞은편 변을 이웃한 변으로 나눈 비율이야.","tan 45°=1","맞은편 나누기 이웃한 변!","p/a"),
    F("m3-circle-central",9,"원의 성질","중심각과 호","같은 호에 대한 중심각은 원주각의 몇 배일까?","2배","중심각은 같은 호에 대한 원주각의 두 배야.","원주각 35° → 중심각 70°","중심각은 원주각 두 배!","2*a"),
    F("m3-circle-inscribed",9,"원의 성질","원주각과 중심각","같은 호에 대한 원주각은 중심각의 몇 분의 1일까?","1/2","같은 호를 보는 원주각은 중심각의 절반이야.","중심각 80° → 원주각 40°","원주각은 중심각 절반!","a/2"),
    F("m3-sector-area",9,"원의 성질","부채꼴의 넓이","중심각 θ도, 반지름 r인 부채꼴의 넓이는?","(θ/360)πr²","전체 원의 넓이에 중심각이 360° 중 차지하는 비율을 곱해.","θ=90° → 원 넓이의 1/4","중심각 비율 곱하기 원 넓이!","(theta/360)*pi*r^2"),
    F("m3-arc-length",9,"원의 성질","호의 길이","중심각 θ도, 반지름 r인 호의 길이는?","(θ/360)2πr","전체 원둘레에 중심각의 비율을 곱해.","θ=90° → πr/2","중심각 비율 곱하기 원둘레!","(theta/360)*2*pi*r"),

    F("h1-set-union",10,"집합과 명제","집합의 합집합","집합 A와 B의 합집합 기호는?","A ∪ B","A 또는 B에 속하는 원소를 모은 집합이야.","A={1,2}, B={2,3} → {1,2,3}","A 또는 B!","A"),
    F("h1-set-intersection",10,"집합과 명제","집합의 교집합","집합 A와 B의 교집합 기호는?","A ∩ B","A와 B에 모두 속하는 원소를 모은 집합이야.","A={1,2}, B={2,3} → {2}","A 그리고 B!","A"),
    F("h1-complement",10,"집합과 명제","여집합","전체집합 U에서 집합 A를 제외한 집합은?","Aᶜ = U\\A","전체집합에 속하지만 A에는 속하지 않는 원소의 모임이야.","U={1,2,3}, A={1} → {2,3}","전체에서 A 빼기!","U-A"),
    F("h1-absolute",10,"방정식과 부등식","절댓값의 뜻","실수 x의 절댓값을 구하는 기호는?","|x|","절댓값은 수직선에서 0으로부터 떨어진 거리야.","|−5|=5","0에서 얼마나 떨어졌는지!","abs(x)"),
    F("h1-quadratic-axis",10,"이차함수","이차함수의 대칭축","y=ax²+bx+c의 대칭축은?","x=−b/(2a)","포물선은 꼭짓점을 지나는 수직선을 기준으로 대칭이야.","y=x²−6x+5 → x=3","−b 나누기 2a!","x=-b/(2*a)"),
    F("h1-line-slope",10,"좌표와 도형","직선의 기울기 공식","두 점 (x1,y1), (x2,y2)를 지나는 직선의 기울기는?","(y2−y1)/(x2−x1)","y의 변화량을 x의 변화량으로 나누어.","(1,2),(3,6) → 2","세로 변화 나누기 가로 변화!","(y2-y1)/(x2-x1)"),
    F("h1-line-point-slope",10,"좌표와 도형","점과 기울기로 직선 구하기","기울기 m이고 점 (x1,y1)을 지나는 직선의 방정식은?","y−y1=m(x−x1)","한 점과 기울기를 알면 직선 전체를 나타낼 수 있어.","기울기 2, (1,3) → y−3=2(x−1)","y 변화량은 m 곱하기 x 변화량!","y-y1=m*(x-x1)"),
    F("h1-distance-midpoint",10,"좌표와 도형","선분의 중점","두 점 A(x1,y1), B(x2,y2)의 중점 좌표를 입력해.","((x1+x2)/2,(y1+y2)/2)","각 좌표의 평균을 구하면 선분의 중점이 돼.","(0,0),(4,6) → (2,3)","각 좌표를 더해 2로 나누기!","(x1+x2)/2;(y1+y2)/2"),
    F("h1-circle-standard",10,"좌표와 도형","원의 방정식","중심 (a,b), 반지름 r인 원의 방정식은?","(x−a)²+(y−b)²=r²","원의 중심에서 점까지 거리가 r이라는 뜻이야.","중심 (1,2), 반지름 3","중심에서 거리 r!","(x-a)^2+(y-b)^2=r^2"),
    F("h1-function-compose",10,"함수","합성함수","f(g(x))를 나타내는 표기는?","(f∘g)(x)=f(g(x))","먼저 g를 적용하고, 그 결과에 f를 적용해.","f(x)=x+1, g(x)=2x → 2x+1","안쪽 함수 먼저!","f(g(x))"),
    F("h1-inverse-function",10,"함수","역함수의 관계","함수와 역함수를 합성하면 원래 입력값 x로 돌아와. 결과를 입력해.","x","역함수는 함수의 작용을 되돌려 원래 입력값을 돌려줘.","f(x)=2x+3 → f⁻¹(x)=(x−3)/2","서로 되돌리는 함수!","x"),
    F("h1-matrix-add",10,"행렬","행렬의 덧셈","같은 크기의 두 행렬 A,B의 합은 각 원소를 어떻게 할까?","대응하는 원소끼리 더한다","행렬의 크기가 같아야 같은 위치의 원소끼리 더할 수 있어.","[[1,2],[3,4]]+[[5,6],[7,8]]","같은 자리에 있는 원소끼리!","a+e;b+f;c+g;d+h"),
    F("h1-matrix-scalar",10,"행렬","행렬의 실수배","실수 k와 행렬 A의 곱 kA는?","모든 원소에 k를 곱한다","행렬 안의 모든 원소에 같은 수를 곱해.","2[[1,2],[3,4]]","원소마다 k 곱하기!","k*a;k*b;k*c;k*d"),

    F("h2-exponent-product",11,"지수함수와 로그함수","거듭제곱의 곱셈","밑이 같은 거듭제곱 a^m과 a^n의 곱은?","a^(m+n)","밑이 같으면 지수를 더해.","2³×2²=2⁵","곱할 때 지수 더하기!","a^m*a^n=a^(m+n)"),
    F("h2-exponent-quotient",11,"지수함수와 로그함수","거듭제곱의 나눗셈","a^m/a^n (a≠0)을 간단히 하면?","a^(m−n)","밑이 같은 거듭제곱의 나눗셈은 지수를 빼.","3⁵/3²=3³","나눌 때 지수 빼기!","a^m/a^n=a^(m-n)"),
    F("h2-exponent-power",11,"지수함수와 로그함수","거듭제곱의 거듭제곱","(a^m)^n을 간단히 하면?","a^(mn)","거듭제곱을 다시 거듭제곱하면 지수끼리 곱해.","(2³)²=2⁶","거듭제곱은 지수끼리 곱하기!","(a^m)^n=a^(m*n)"),
    F("h2-log-quotient",11,"지수함수와 로그함수","로그의 나눗셈 법칙","log_a(x/y)를 로그의 차로 나타내면?","log_a(x)−log_a(y)","진수의 나눗셈은 로그의 뺄셈으로 바뀌어.","log₂(8/2)=3−1","나누기는 로그의 빼기!","log(x/y)=log(x)-log(y)"),
    F("h2-log-power",11,"지수함수와 로그함수","로그의 거듭제곱 법칙","log_a(x^r)을 간단히 하면?","r log_a(x)","진수의 지수는 로그의 앞 계수로 내려와.","log₂(8²)=2×3","지수는 앞으로!","log(x^r)=r*log(x)"),
    F("h2-log-inverse",11,"지수함수와 로그함수","지수와 로그의 역관계","a>0, a≠1일 때 log_a(a^x)는?","x","로그는 밑 a의 거듭제곱을 지수로 되돌려.","log₂(2⁵)=5","로그와 지수는 서로 역관계!","x"),
    F("h2-sine-cosine",11,"삼각함수","삼각함수의 관계","sin(−x)는 무엇과 같을까?","−sin(x)","사인 함수는 원점에 대하여 대칭인 홀함수야.","sin(−30°)=−1/2","사인은 홀함수!","-sin(x)"),
    F("h2-cos-even",11,"삼각함수","코사인의 대칭","cos(−x)는 무엇과 같을까?","cos(x)","코사인 함수는 y축에 대하여 대칭인 짝함수야.","cos(−60°)=1/2","코사인은 짝함수!","cos(x)"),
    F("h2-double-angle-sin",11,"삼각함수","사인 두 배각 공식","sin(2x)를 나타내는 공식은?","2sin(x)cos(x)","사인 두 배각은 사인과 코사인의 곱의 두 배야.","sin(60°)=2sin30°cos30°","2 sin cos!","2*sin(x)*cos(x)"),
    F("h2-double-angle-cos",11,"삼각함수","코사인 두 배각 공식","cos(2x)를 나타내는 공식 한 가지는?","cos²x−sin²x","코사인 두 배각은 제곱의 차로 나타낼 수 있어.","cos(2x)=cos²x−sin²x","코사인 제곱 빼기 사인 제곱!","cos(x)^2-sin(x)^2"),
    F("h2-arithmetic-sum",11,"수열","등차수열의 합","첫째항 a1, 공차 d인 등차수열의 첫 n항의 합은?","n(2a1+(n−1)d)/2","첫째항과 끝항의 평균에 항의 개수를 곱한 식이야.","2,5,8의 합=15","항의 개수 곱하기 첫째·끝째 평균!","n*(2*a1+(n-1)*d)/2"),
    F("h2-geometric-sum",11,"수열","등비수열의 합","첫째항 a, 공비 r(r≠1)인 등비수열의 첫 n항의 합은?","a(r^n−1)/(r−1)","각 항을 같은 비율로 곱해 더한 합이야.","2+4+8+16=30","공비의 거듭제곱 이용!","a*(r^n-1)/(r-1)"),
    F("h2-binomial",11,"수열","이항정리의 기본형","(a+b)^n의 전개에 쓰이는 일반항은?","nCr a^(n−r)b^r","각 항의 계수는 조합 nCr로 정해져.","(a+b)^2=a²+2ab+b²","조합 계수와 거듭제곱!","nCr*a^(n-r)*b^r"),

    F("h3-limit-sum",12,"미적분","함수의 극한의 합","극한의 합 법칙을 입력해.","lim(f+g)=lim f+lim g","각 극한이 존재하면 합의 극한은 극한의 합과 같아.","lim(x+2)=lim x+lim 2","합의 극한은 극한의 합!","L(f+g)=L(f)+L(g)"),
    F("h3-limit-product",12,"미적분","함수의 극한의 곱","극한의 곱 법칙을 입력해.","lim(fg)=(lim f)(lim g)","각 극한이 존재하면 곱의 극한은 극한의 곱과 같아.","lim(x·x)=lim x·lim x","곱의 극한은 극한의 곱!","L(f*g)=L(f)*L(g)"),
    F("h3-derivative-constant",12,"미분","상수의 미분","상수 c를 미분하면?","0","상수함수는 x가 변해도 값이 변하지 않아 기울기가 0이야.","d/dx(7)=0","상수는 미분하면 0!","0"),
    F("h3-derivative-sum",12,"미분","합의 미분법","f(x)+g(x)의 도함수는?","f'(x)+g'(x)","합을 미분하면 각 항을 따로 미분해 더하면 돼.","(x²+sin x)'=2x+cos x","각 항을 따로 미분!","u+v"),
    F("h3-derivative-product",12,"미분","곱의 미분법","f'=u, g'=v일 때 (fg)'는?","ug+fv","앞을 미분해 뒤를 곱하고, 앞에 뒤를 미분한 것을 더해.","(x²sin x)'=2xsin x+x²cos x","앞 미분×뒤 + 앞×뒤 미분!","u*g+f*v"),
    F("h3-derivative-quotient",12,"미분","몫의 미분법","분모 g가 0이 아닐 때 (f/g)'는?","(f'g−fg')/g²","분자 미분 곱하기 분모에서 분자 곱하기 분모 미분을 빼고 분모 제곱으로 나눠.","(x/ x²)'=−1/x²","위 미분×아래 − 위×아래 미분!","(u*g-f*v)/g^2"),
    F("h3-chain-rule",12,"미분","합성함수의 미분","합성함수의 바깥 미분값이 u, 안쪽 미분값이 v일 때 도함수는?","바깥 미분값 × 안쪽 미분값","바깥 함수를 미분한 뒤 안쪽 함수를 미분해 곱해.","(sin x²)′=2x cos(x²)","바깥 미분 곱하기 안쪽 미분!","u*v"),
    F("h3-derivative-sin",12,"미분","사인 함수의 미분","sin x를 미분하면?","cos x","사인 함수의 도함수는 코사인 함수야.","(sin x)'=cos x","사인은 미분하면 코사인!","cos(x)"),
    F("h3-derivative-cos",12,"미분","코사인 함수의 미분","cos x를 미분하면?","−sin x","코사인 함수의 도함수는 마이너스 사인이야.","(cos x)'=−sin x","코사인은 마이너스 사인!","-sin(x)"),
    F("h3-antiderivative-constant",12,"적분","상수함수의 적분","상수 c의 부정적분은?","cx+C","상수를 적분하면 x를 곱하고 적분상수 C를 더해.","∫3 dx=3x+C","상수 곱하기 x!","c*x+C"),
    F("h3-integral-sum",12,"적분","합의 적분법","f, g의 부정적분을 각각 F, G라 하면 f+g의 부정적분은?","F + G + C","합을 적분하면 각 항을 따로 적분해 더할 수 있어.","∫(x+1)dx=x²/2+x+C","각 항을 따로 적분!","F+G"),
    F("h3-area-between",12,"적분","두 곡선 사이 넓이","위쪽 함수 f(x), 아래쪽 함수 g(x)가 a≤x≤b에서 만나는 사이 넓이는?","∫[f(x)−g(x)]dx","위쪽 함수에서 아래쪽 함수를 빼 적분하면 사이 넓이를 구해.","f=x+2, g=x → 직사각형 넓이","위 함수 빼기 아래 함수!","integral(f-g)"),
    F("h3-binomial-prob",12,"확률과 통계","이항분포의 확률","X~B(n,p)일 때 P(X=k)를 조합식으로 나타내면?","nCk p^k(1−p)^(n−k)","n번의 독립 시행에서 성공이 k번 일어날 확률이야.","B(4,0.5)에서 P(X=2)=6/16","조합×성공확률×실패확률!","n!/(k!*(n-k)!)*p^k*(1-p)^(n-k)"),
    F("h3-binomial-mean",12,"확률과 통계","이항분포의 평균","X~B(n,p)의 기댓값은?","np","독립인 n번 시행에서 성공 횟수의 평균은 n과 성공확률 p의 곱이야.","B(10,0.3)의 평균은 3","시행 횟수 곱하기 성공확률!","n*p"),
    F("h3-binomial-var",12,"확률과 통계","이항분포의 분산","X~B(n,p)의 분산은?","np(1−p)","각 시행이 독립인 이항분포의 분산 공식이야.","B(10,0.3)의 분산은 2.1","np 곱하기 실패확률!","n*p*(1-p)"),
    F("h3-normal-standard",12,"확률과 통계","정규분포 표준화","평균 μ, 표준편차 σ인 값 x의 표준화 식은?","z=(x−μ)/σ","평균을 빼고 표준편차로 나누어 표준정규분포로 바꿔.","μ=70,σ=10,x=80 → z=1","평균 빼기, 표준편차 나누기!","(x-mu)/sigma"),
    F("h3-vector-dot",12,"기하와 벡터","벡터의 내적","벡터 a,b 사이 각이 θ일 때 내적은?","|a||b|cos θ","벡터 크기와 끼인각의 코사인을 곱해.","직교하면 내적 0","크기 곱하기 코사인!","abs(a)*abs(b)*cos(theta)"),
    F("h3-vector-length",12,"기하와 벡터","벡터의 크기","2차원 벡터 (a,b)의 크기는?","sqrt(a²+b²)","좌표의 두 성분을 제곱해 더한 다음 제곱근을 취해.","(3,4)의 크기=5","성분 제곱 합의 루트!","sqrt(a^2+b^2)"),
    F("h3-conic-ellipse",12,"기하와 벡터","타원의 표준형","중심이 원점인 타원의 표준형 한 가지를 입력해.","x²/a² + y²/b² = 1","장축이 x축 방향일 때 타원의 표준 방정식이야.","a=5,b=3","두 분수의 합은 1!","x^2/a^2+y^2/b^2=1"),
    F("h3-conic-hyperbola",12,"기하와 벡터","쌍곡선의 표준형","중심이 원점이고 실축이 x축인 쌍곡선의 표준형은?","x²/a² − y²/b² = 1","두 제곱 항 사이에 빼기가 있는 표준형이야.","a=3,b=2","x제곱 항에서 y제곱 항 빼기!","x^2/a^2-y^2/b^2=1"),
    F("h3-conic-parabola",12,"기하와 벡터","포물선의 표준형","꼭짓점이 원점이고 축이 x축인 포물선의 표준형 하나는?","y²=4px","초점과 준선으로부터 거리가 같은 점들의 모임이 포물선이야.","p=2 → y²=8x","y제곱은 4px!","y^2=4*p*x")
  ];

  var nonQuizIds = new Set([
    "h1-set-union","h1-set-intersection","h1-complement",
    "m2-system-add","h3-area-between"
  ]);
  var answerOverrides = {
    "m1-integer-mul":"-1",
    "m1-order-ops":"6",
    "h1-inverse-function":"x",
    "h1-line-point-slope":"y-y_1=m*(x-x_1)"
  };
  var questionOverrides = {
    "m1-integer-mul":"서로 다른 부호의 두 정수 곱의 부호를 입력해. (+1은 양수, −1은 음수)",
    "m1-order-ops":"3×(4+2)에서 가장 먼저 계산하는 괄호 안의 값을 입력해.",
    "p1-compare":"9는 6보다 크다는 관계를 식으로 입력해.",
    "h3-product-rule":"두 함수의 도함수를 각각 u, v라 할 때 곱의 미분식을 입력해.",
    "h3-conditional":"P(A∩B)=p_ab, P(B)=p_b일 때 조건부확률을 입력해.",
    "h3-vector":"a=(a_x,a_y), b=(b_x,b_y)일 때 두 벡터의 내적을 좌표로 입력해."
  };
  course.forEach(function (card) {
    if (nonQuizIds.has(card.id)) card.quiz = false;
    if (Object.prototype.hasOwnProperty.call(answerOverrides,card.id)) card.answer = answerOverrides[card.id];
    if (Object.prototype.hasOwnProperty.call(questionOverrides,card.id)) card.question = questionOverrides[card.id];
  });

  course.push.apply(course, additions);
  window.ROCKEY_FORMULA_COURSE = course;

  function normalizeSource(input) {
    var s = String(input == null ? "" : input).trim();
    s = s.replace(/[−–—]/g,"-").replace(/[×·⋅]/g,"*").replace(/[÷]/g,"/").replace(/:/g,"/");
    s = s.replace(/π/g,"pi").replace(/θ/g,"theta").replace(/α/g,"alpha").replace(/β/g,"beta").replace(/μ/g,"mu").replace(/σ/g,"sigma").replace(/Δ/g,"delta");
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,function (ch) { return "^" + "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(ch); });
    s = s.replace(/√\s*([A-Za-z0-9_]+|\([^()]*\))/g,"sqrt($1)");
    s = s.replace(/∓/g,"±");
    return s;
  }

  function splitStatements(source) {
    var parts = [], start = 0, depth = 0;
    for (var i = 0; i < source.length; i++) {
      var ch = source[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if ((ch === ";" || ch === ",") && depth === 0) {
        parts.push(source.slice(start,i).trim());
        start = i + 1;
      }
    }
    parts.push(source.slice(start).trim());
    return parts.filter(Boolean);
  }

  function tokenize(source) {
    var tokens = [], i = 0;
    var functions = ["sqrt","sin","cos","tan","log","ln","abs","exp","floor","ceil"];
    var constants = ["pi","e"];
    var greek = ["alpha","beta","theta","mu","sigma","delta","lambda","omega"];
    while (i < source.length) {
      var ch = source[i];
      if (/\s/.test(ch)) { i++; continue; }
      var number = source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (number) {
        tokens.push({type:"number",value:Number(number[0])});
        i += number[0].length;
        continue;
      }
      if (/[A-Za-z_]/.test(ch) || /[α-ωΑ-Ω]/.test(ch)) {
        var word = source.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/);
        if (word) {
          var name = word[0];
          i += name.length;
          var lower = name.toLowerCase();
          if (functions.indexOf(lower) >= 0) tokens.push({type:"function",value:lower});
          else if (constants.indexOf(lower) >= 0 || greek.indexOf(lower) >= 0 || name.indexOf("_") >= 0 || name.length === 1) {
            tokens.push({type:"identifier",value:lower});
          } else {
            for (var k = 0; k < name.length; k++) tokens.push({type:"identifier",value:name[k].toLowerCase()});
          }
          continue;
        }
        // A standalone Greek character is a single variable.
        tokens.push({type:"identifier",value:ch.toLowerCase()});
        i++;
        continue;
      }
      var two = source.slice(i,i+2);
      if ([">=","<=","!="].indexOf(two) >= 0) {
        tokens.push({type:"operator",value:two}); i += 2; continue;
      }
      if ("+-*/^!()=><".indexOf(ch) >= 0) {
        tokens.push({type:"operator",value:ch}); i++; continue;
      }
      if (ch === "≤") { tokens.push({type:"operator",value:"<="}); i++; continue; }
      if (ch === "≥") { tokens.push({type:"operator",value:">="}); i++; continue; }
      if (ch === "−") { tokens.push({type:"operator",value:"-"}); i++; continue; }
      throw new Error("입력할 수 없는 문자: " + ch);
    }

    // Allow ordinary calculator notation such as 2x, 3(x+1), xy, and (a+b)(c+d).
    var expanded = [];
    for (var t = 0; t < tokens.length; t++) {
      var current = tokens[t];
      var previous = expanded[expanded.length - 1];
      if (previous) {
        var prevEnds = previous.type === "number" || previous.type === "identifier" ||
          (previous.type === "operator" && [")","!"].indexOf(previous.value) >= 0);
        var nextStarts = current.type === "number" || current.type === "identifier" ||
          current.type === "function" ||
          (current.type === "operator" && current.value === "(");
        var functionCall = previous.type === "function" && current.type === "operator" && current.value === "(";
        if (prevEnds && nextStarts && !functionCall) expanded.push({type:"operator",value:"*"});
      }
      expanded.push(current);
    }
    return expanded;
  }

  function parseExpression(source) {
    var tokens = tokenize(source), position = 0;
    function peek(value) {
      var token = tokens[position];
      return token && (value === undefined || token.value === value) ? token : null;
    }
    function take(value) {
      var token = peek(value);
      if (token) position++;
      return token;
    }
    function expect(value) {
      if (!take(value)) throw new Error("수식에 '" + value + "'가 필요해.");
    }
    function primary() {
      var token = tokens[position++];
      if (!token) throw new Error("수식이 끝나지 않았어.");
      if (token.type === "number") return {type:"number",value:token.value};
      if (token.type === "identifier") return {type:"variable",name:token.value};
      if (token.type === "function") {
        if (peek("(")) {
          expect("(");
          var args = [];
          if (!peek(")")) {
            args.push(comparison());
            while (take(",")) args.push(comparison());
          }
          expect(")");
          return {type:"call",name:token.value,args:args};
        }
        throw new Error(token.value + " 뒤에 괄호를 입력해 줘.");
      }
      if (token.type === "operator" && token.value === "(") {
        var inner = comparison();
        expect(")");
        return inner;
      }
      throw new Error("수식의 항을 확인해 줘.");
    }
    function postfix() {
      var node = primary();
      while (take("!")) node = {type:"factorial",value:node};
      return node;
    }
    function power() {
      var node = postfix();
      if (take("^")) node = {type:"binary",op:"^",left:node,right:unary()};
      return node;
    }
    function unary() {
      if (take("+")) return unary();
      if (take("-")) return {type:"unary",op:"-",value:unary()};
      return power();
    }
    function multiply() {
      var node = unary();
      while (peek("*") || peek("/")) {
        var op = tokens[position++].value;
        node = {type:"binary",op:op,left:node,right:unary()};
      }
      return node;
    }
    function add() {
      var node = multiply();
      while (peek("+") || peek("-")) {
        var op = tokens[position++].value;
        node = {type:"binary",op:op,left:node,right:multiply()};
      }
      return node;
    }
    function comparison() {
      var node = add();
      if (peek("=") || peek(">") || peek("<") || peek(">=") || peek("<=") || peek("!=")) {
        var op = tokens[position++].value;
        node = {type:"compare",op:op,left:node,right:add()};
      }
      return node;
    }
    var ast = comparison();
    if (position !== tokens.length) throw new Error("수식의 연산자나 괄호를 확인해 줘.");
    return ast;
  }

  function topLevelEquals(source) {
    var depth = 0, found = -1;
    for (var i = 0; i < source.length; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
      else if (source[i] === "=" && depth === 0) {
        if (source[i-1] === ">" || source[i-1] === "<" || source[i-1] === "!") continue;
        if (source[i+1] === "=") continue;
        if (found >= 0) throw new Error("등호는 한 식에 하나씩 사용해 줘.");
        found = i;
      }
    }
    return found;
  }

  function parseStatements(source) {
    return splitStatements(source).map(function (part) {
      var index = topLevelEquals(part);
      if (index >= 0) {
        var left = part.slice(0,index).trim(), right = part.slice(index+1).trim();
        if (!left || !right) throw new Error("등호의 양쪽에 식을 입력해 줘.");
        return {kind:"equation",left:parseExpression(left),right:parseExpression(right)};
      }
      return {kind:"expression",ast:parseExpression(part)};
    });
  }

  function variableNames(node, result) {
    result = result || new Set();
    if (!node) return result;
    if (node.type === "variable") result.add(node.name);
    if (node.value && typeof node.value === "object") variableNames(node.value,result);
    if (node.left) variableNames(node.left,result);
    if (node.right) variableNames(node.right,result);
    if (node.args) node.args.forEach(function (arg) { variableNames(arg,result); });
    return result;
  }

  function variableValue(name, sample) {
    var base = {
      a:1.1,b:7.2,c:1.3,d:2.7,e:3.1,f:4.2,g:2.2,h:5.1,
      x:2.3,y:3.7,z:4.9,n:7,r:2,p:3,q:5,
      alpha:2.2,beta:4.3,theta:.7,mu:3.4,sigma:1.6,delta:2.5,
      u:1.7,v:2.9,w:3.3,t:4.1,S:6,T:8,B:5,C:2,
      P:2,m:3,k:4,i:2,j:5
    };
    if (/^(a_1|a_n|x_1|x_2|y_1|y_2|p_1|p_2|p_ab|p_b|a_x|a_y|b_x|b_y)$/.test(name)) {
      var special = {a_1:2,a_n:5,x_1:1,x_2:4,y_1:2,y_2:7,p_1:.3,p_2:.7,p_ab:.2,p_b:.5,a_x:2,a_y:3,b_x:4,b_y:1};
      return special[name] + sample * .03;
    }
    var value = Object.prototype.hasOwnProperty.call(base,name) ? base[name] : 1.9 + (name.charCodeAt(0)%7)*.41;
    if (name === "n" || name === "r" || name === "m" || name === "k") return Math.max(1,Math.round(value + sample%2));
    return value + sample * .071;
  }

  function evaluate(node, vars) {
    if (node.type === "number") return node.value;
    if (node.type === "variable") {
      if (node.name === "pi") return Math.PI;
      if (node.name === "e") return Math.E;
      if (!Object.prototype.hasOwnProperty.call(vars,node.name)) throw new Error("문자 " + node.name + "의 값을 확인할 수 없어.");
      return vars[node.name];
    }
    if (node.type === "unary") return -evaluate(node.value,vars);
    if (node.type === "factorial") {
      var n = evaluate(node.value,vars);
      if (n < 0 || Math.abs(n-Math.round(n)) > 1e-9 || n > 170) throw new Error("팩토리얼은 0부터 170까지의 정수만 계산할 수 있어.");
      var product = 1;
      for (var i = 2; i <= n; i++) product *= i;
      return product;
    }
    if (node.type === "binary") {
      var left = evaluate(node.left,vars), right = evaluate(node.right,vars);
      if (node.op === "+") return left+right;
      if (node.op === "-") return left-right;
      if (node.op === "*") return left*right;
      if (node.op === "/") {
        if (Math.abs(right) < 1e-12) throw new Error("0으로 나눌 수 없어.");
        return left/right;
      }
      if (node.op === "^") return Math.pow(left,right);
    }
    if (node.type === "compare") {
      var lhs = evaluate(node.left,vars), rhs = evaluate(node.right,vars);
      if (node.op === "=") return Math.abs(lhs-rhs) < 1e-9 ? 1 : 0;
      if (node.op === ">") return lhs>rhs ? 1:0;
      if (node.op === "<") return lhs<rhs ? 1:0;
      if (node.op === ">=") return lhs>=rhs ? 1:0;
      if (node.op === "<=") return lhs<=rhs ? 1:0;
      if (node.op === "!=") return lhs!==rhs ? 1:0;
    }
    if (node.type === "call") {
      var args = node.args.map(function (arg) { return evaluate(arg,vars); });
      var x = args[0];
      if (node.name === "sqrt") { if (x < 0) throw new Error("실수 범위에서 음수의 제곱근은 입력할 수 없어."); return Math.sqrt(x); }
      if (node.name === "sin") return Math.sin(x);
      if (node.name === "cos") return Math.cos(x);
      if (node.name === "tan") return Math.tan(x);
      if (node.name === "ln" || node.name === "log") {
        if (x <= 0) throw new Error("로그의 진수는 양수여야 해.");
        return Math.log(x);
      }
      if (node.name === "abs") return Math.abs(x);
      if (node.name === "exp") return Math.exp(x);
      if (node.name === "floor") return Math.floor(x);
      if (node.name === "ceil") return Math.ceil(x);
    }
    throw new Error("이 수식은 아직 계산할 수 없어.");
  }

  function close(a,b) {
    return Number.isFinite(a) && Number.isFinite(b) &&
      Math.abs(a-b) <= 1e-7 * Math.max(1,Math.abs(a),Math.abs(b));
  }

  function compareStatement(input, expected) {
    var inputVars = new Set(), expectedVars = new Set();
    variableNames(input,inputVars);
    variableNames(expected,expectedVars);
    var names = new Set();
    inputVars.forEach(function (v) { names.add(v); });
    expectedVars.forEach(function (v) { names.add(v); });
    var ratio = null, good = 0;
    for (var sample = 0; sample < 9; sample++) {
      var vars = {};
      names.forEach(function (name) { vars[name] = variableValue(name,sample); });
      try {
        if (input.kind === "expression" && expected.kind === "expression") {
          var av = evaluate(input.ast,vars), bv = evaluate(expected.ast,vars);
          if (!close(av,bv)) return false;
          good++;
        } else if (input.kind === "equation" && expected.kind === "equation") {
          var ai = evaluate(input.left,vars)-evaluate(input.right,vars);
          var bi = evaluate(expected.left,vars)-evaluate(expected.right,vars);
          if (Math.abs(ai)<1e-9 && Math.abs(bi)<1e-9) { good++; continue; }
          if (Math.abs(bi)<1e-9 || Math.abs(ai)<1e-9) return false;
          var currentRatio = ai/bi;
          if (ratio === null) ratio = currentRatio;
          else if (!close(currentRatio,ratio)) return false;
          good++;
        } else {
          return false;
        }
      } catch (_) {
        // Some sample values may fall outside a root/log domain; other samples are used.
      }
    }
    return good >= 4;
  }

  function expandPlusMinus(source) {
    if (source.indexOf("±") < 0) return [source];
    var index = source.indexOf("±");
    return expandPlusMinus(source.slice(0,index) + "+" + source.slice(index+1))
      .concat(expandPlusMinus(source.slice(0,index) + "-" + source.slice(index+1)));
  }

  function check(input, expected) {
    try {
      var inputText = normalizeSource(input);
      if (!inputText) return {correct:false,error:"답을 입력해 줘."};
      var inputVariants = expandPlusMinus(inputText);
      var answersToTry = Array.isArray(expected) ? expected : [expected];
      for (var i = 0; i < inputVariants.length; i++) {
        var inputStatements = parseStatements(inputVariants[i]);
        for (var j = 0; j < answersToTry.length; j++) {
          var expectedStatements = parseStatements(normalizeSource(answersToTry[j]));
          if (inputStatements.length !== expectedStatements.length) continue;
          var all = true;
          for (var k = 0; k < inputStatements.length; k++) {
            if (!compareStatement(inputStatements[k],expectedStatements[k])) { all=false; break; }
          }
          if (all) return {correct:true,error:""};
        }
      }
      return {correct:false,error:"식은 읽었지만 정답과 같지 않아. 부호, 괄호, 제곱, 루트 위치를 다시 확인해 봐."};
    } catch (error) {
      return {correct:false,error:error && error.message ? error.message : "수식을 읽지 못했어."};
    }
  }

  window.ROCKEY_MATH_INPUT = {
    check:check,
    parse:function (source) { return parseStatements(normalizeSource(source)); },
    normalize:normalizeSource
  };
})();