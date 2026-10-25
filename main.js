// =======================
// 画面
// =======================

const participantScreen =
    document.getElementById("participantScreen");

const participantIdInput =
    document.getElementById("participantId");

const participantNextButton =
    document.getElementById("participantNextButton");

const startButton =
    document.getElementById("startButton");

let participantId = "";

const startScreen =
    document.getElementById("startScreen");

const questionScreen =
    document.getElementById("questionScreen");

const stimulus =
    document.getElementById("stimulus");

const yesButton =
    document.getElementById("yesButton");

const noButton =
    document.getElementById("noButton");

const waitScreen =
    document.getElementById("waitScreen");

const waitLabel =
    document.getElementById("waitLabel");

const finishScreen =
    document.getElementById("finishScreen");

const downloadButton =
    document.getElementById("downloadButton");

// =======================
// 現在の問題
// =======================

let currentStimulus = "";

let currentAnswer = false;

let startTime = 0;


// =======================
// 結果保存
// =======================

let results = [];


// =======================
// 実験条件
// =======================

const modes = [
    "none",
    "elapsed",
    "remaining"
];

const waitTimes = [
    0,
    5,
    15,
    25,
    35
];

let conditions = [];

let conditionIndex = 0;


// =======================
// 問題設定
// =======================

// 1ブロック4問
const blockSize = 4;

// ベースライン4問
// 条件15個 × 4問
// 合計16ブロック
const totalBlocks = 16;

// 合計64問
const totalQuestions =
    blockSize * totalBlocks;


// =======================
// 問題
// =======================

// 問題プール
let questionPool = [];

let answerPool = [];

// 実際に使う64問
let questions = [];

let answers = [];

let questionIndex = 0;


// =======================
// ベース課題かどうか
// =======================

let basePhase = true;


// =======================
// 条件生成
// =======================

function generateConditions(){

    conditions = [];


    // 3種類の表示方法
    // ×
    // 5種類の待機時間
    // = 15条件

    for(const mode of modes){

        for(const time of waitTimes){

            conditions.push({

                mode: mode,

                waitTime: time

            });

        }

    }


    // =======================
    // 条件をシャッフル
    // =======================

    for(
        let i = conditions.length - 1;
        i > 0;
        i--
    ){

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );


        [
            conditions[i],
            conditions[j]
        ] =
        [
            conditions[j],
            conditions[i]
        ];

    }


    // 確認用
    console.log(
        "===== 条件一覧 ====="
    );


    conditions.forEach((condition, index)=>{

        console.log(

            (index + 1) +
            " : " +
            condition.mode +
            " " +
            condition.waitTime +
            "秒"

        );

    });

}


// =======================
// 計算問題生成
// =======================


function generateQuestions() {

    // =======================
    // 問題をシャッフルする関数
    // =======================
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // =======================
    // 問題を4種類に分ける
    // =======================
    const addCorrect = [];
    const addIncorrect = [];
    const subCorrect = [];
    const subIncorrect = [];

    // 問題の重複を防ぐ
    const seen = new Set();

    function addProblem(pool, stimulus, answer) {
        if (seen.has(stimulus)) return;

        seen.add(stimulus);
        pool.push({
            stimulus: stimulus,
            answer: answer
        });
    }

    // =======================
    // 問題を生成
    // =======================
    for (let a = 20; a <= 99; a++) {
        for (let b = 20; b <= 99; b++) {

            // -----------------------
            // 足し算：繰り上がりあり
            // 答えは2桁（99以下）
            // -----------------------
            if (
                (a % 10) + (b % 10) >= 10 &&
                a + b <= 99
            ) {
                const ans = a + b;

                addProblem(
                    addCorrect,
                    `${a} + ${b} = ${ans}`,
                    true
                );

                // 誤答は正解の±10
                // ただし答えは2桁のまま
                for (const wrong of [ans - 10, ans + 10]) {
                    if (wrong >= 10 && wrong <= 99) {
                        addProblem(
                            addIncorrect,
                            `${a} + ${b} = ${wrong}`,
                            false
                        );
                    }
                }
            }

            // -----------------------
            // 引き算：繰り下がりあり
            // 答えは2桁（10以上）
            // -----------------------
            if (
                a > b &&
                (a % 10) < (b % 10) &&
                a - b >= 10
            ) {
                const ans = a - b;

                addProblem(
                    subCorrect,
                    `${a} - ${b} = ${ans}`,
                    true
                );

                // 誤答は正解の±10
                // ただし答えは2桁のまま
                for (const wrong of [ans - 10, ans + 10]) {
                    if (wrong >= 10 && wrong <= 99) {
                        addProblem(
                            subIncorrect,
                            `${a} - ${b} = ${wrong}`,
                            false
                        );
                    }
                }
            }
        }
    }

    // =======================
    // 各種類から16問ずつ選ぶ
    // 合計64問
    // =======================
    const pools = [
        { name: "足し算・正しい", data: addCorrect },
        { name: "足し算・間違い", data: addIncorrect },
        { name: "引き算・正しい", data: subCorrect },
        { name: "引き算・間違い", data: subIncorrect }
    ];

    const selectedPools = [];

    for (const pool of pools) {
        shuffle(pool.data);

        if (pool.data.length < 16) {
            throw new Error(
                pool.name + "の問題が16問未満です：" +
                pool.data.length + "問"
            );
        }

        selectedPools.push(pool.data.slice(0, 16));
    }

    // =======================
    // 4問ずつのブロックを作成
    // 各ブロックに4種類を1問ずつ入れる
    // =======================
    const blocks = [];

    for (let i = 0; i < 16; i++) {
        const block = [
            selectedPools[0][i],
            selectedPools[1][i],
            selectedPools[2][i],
            selectedPools[3][i]
        ];

        // ブロック内の問題順をランダムにする
        shuffle(block);
        blocks.push(block);
    }

    // ブロックの順番もランダムにする
    shuffle(blocks);

    // =======================
    // 実験で使用する配列に格納
    // =======================
    questionPool = [];
    answerPool = [];
    questions = [];
    answers = [];

    for (const block of blocks) {
        for (const problem of block) {
            questionPool.push(problem.stimulus);
            answerPool.push(problem.answer);

            questions.push(problem.stimulus);
            answers.push(problem.answer);
        }
    }

    console.log("===== 問題構成 =====");
    console.log("合計問題数：", questions.length);
    console.log("正しい問題：",
        answers.filter(answer => answer).length);
    console.log("間違った問題：",
        answers.filter(answer => !answer).length);
    console.log("足し算：",
        questions.filter(q => q.includes("+")).length);
    console.log("引き算：",
        questions.filter(q => q.includes("-")).length);

    console.log("===== ブロック別の問題 =====");

    for (let i = 0; i < 16; i++) {
        console.log(
            `ブロック${i + 1}`,
            questions.slice(i * 4, i * 4 + 4)
        );
    }
}



// =======================
// 問題表示
// =======================

function showQuestion(){

    // =======================
    // 現在の問題
    // =======================

    currentStimulus =
        questions[questionIndex];


    // =======================
    // 正解
    // =======================

    currentAnswer =
        answers[questionIndex];


    // =======================
    // 問題を表示
    // =======================

    stimulus.textContent =
        currentStimulus;


    // =======================
    // 反応時間計測開始
    // =======================

    startTime =
        performance.now();

}


// =======================
// 待機画面
// =======================

function startWaitScreen(){

    // 待機中は保存ボタンを非表示
    downloadButton.style.display =
        "none";


    // =======================
    // 現在の待機条件
    // =======================

    const currentCondition =
        conditions[conditionIndex];


    const waitTime =
        currentCondition.waitTime;


    const mode =
        currentCondition.mode;


    // =======================
    // 問題画面を消す
    // =======================

    questionScreen.style.display =
        "none";


    // =======================
    // 待機画面を表示
    // =======================

    waitScreen.style.display =
        "block";


    // =======================
    // 表示なし
    // =======================

    if(mode === "none"){

        waitLabel.textContent =
            "お待ちください";

    }


    // =======================
    // 残り時間
    // =======================

    else if(mode === "remaining"){

        let remain =
            waitTime;


        waitLabel.textContent =
            "残り時間：" +
            remain +
            "秒";


        const timer =
            setInterval(()=>{

                remain--;


                if(remain > 0){

                    waitLabel.textContent =
                        "残り時間：" +
                        remain +
                        "秒";

                }


                if(remain <= 0){

                    clearInterval(timer);

                }

            },1000);

    }


    // =======================
    // 経過時間
    // =======================

    else{

        let elapsed = 0;


        waitLabel.textContent =
            "経過時間：0秒";


        const timer =
            setInterval(()=>{

                elapsed++;


                waitLabel.textContent =
                    "経過時間：" +
                    elapsed +
                    "秒";


                if(
                    elapsed >= waitTime
                ){

                    clearInterval(timer);

                }

            },1000);

    }


    // =======================
    // 待機終了後
    // =======================

    setTimeout(()=>{


        // =======================
        // ベース課題終了後
        // =======================

        if(basePhase){

            basePhase = false;

             questionIndex = blockSize;


            // 最初の条件の待機後
            // 条件1の4問を開始

            waitScreen.style.display =
                "none";

            questionScreen.style.display =
                "block";


            showQuestion();

            return;

        }

        // =======================
        // 条件がまだ残っている
        // =======================

        if(
            conditionIndex <
            conditions.length
        ){

            waitScreen.style.display =
                "none";


            questionScreen.style.display =
                "block";


            showQuestion();

            return;

        }


        // =======================
// 全条件終了
// =======================

waitScreen.style.display =
    "none";

questionScreen.style.display =
    "none";

finishScreen.style.display =
    "block";

    }, waitTime * 1000);

}


// =======================
// 正解判定
// =======================

function checkAnswer(userPressedYes){

    // =======================
    // 反応時間
    // =======================

    const reactionTime =
        performance.now() -
        startTime;


    // =======================
    // 正解判定
    // =======================

    const correct =
        userPressedYes ===
        answers[questionIndex];


    // =======================
    // 結果保存
    // =======================

    results.push({

        // ベース課題か条件課題か
        phase:
            basePhase
                ? "base"
                : "condition",


        // 課題
        task:
            "CALCULATION",


        // 問題
        stimulus:
            questions[questionIndex],


        // 正誤
        correct:
            correct,


        // 反応時間
        reactionTime:
            reactionTime.toFixed(1),


        // 表示方法
        mode:
            basePhase
                ? "none"
                : conditions[
                    conditionIndex
                  ].mode,


        // 待機時間
        waitTime:
            basePhase
                ? 0
                : conditions[
                    conditionIndex
                  ].waitTime,


        // 条件番号
        condition:
            basePhase
                ? "base"
                : conditionIndex

    });


    console.log(
        results
    );


    // =======================
    // 問題数を1増やす
    // =======================

    questionIndex++;


    // =======================
    // 4問終了
    // =======================

    if( 
    questionIndex % 
    blockSize === 0 
){

    // 条件15終了
if(
    !basePhase &&
    conditionIndex === conditions.length - 1
){

    waitScreen.style.display =
        "none";

    questionScreen.style.display =
        "none";

    finishScreen.style.display =
        "block";

    return;
}

    // ベースライン終了後は、条件番号を進めずに
    // 最初の条件（conditionIndex = 0）から開始する
    if (basePhase) {
        startWaitScreen();
        return;
    }

    // 条件の4問が終了したら、次の条件へ
conditionIndex++;
startWaitScreen();

return;
}

// =======================
// 次の問題
// =======================

// 4問の途中なら次の問題を表示
showQuestion();

}




// =======================
// CSV保存
// =======================

function downloadCSV(){

    // =======================
    // CSVの見出し
    // =======================

    let csv =
    "participantId,phase,task,stimulus,correct,reactionTime,mode,waitTime,condition\n";


    // =======================
    // 結果をCSVに追加
    // =======================

    results.forEach((r)=>{

        csv +=
    participantId + "," +
    r.phase + "," +
    r.task + "," +
    r.stimulus + "," +
    r.correct + "," +
    r.reactionTime + "," +
    r.mode + "," +
    r.waitTime + "," +
    r.condition +
    "\n";

    });


    // =======================
    // CSVファイル作成
    // =======================

    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv"
            }
        );


    // =======================
    // ダウンロード
    // =======================

    const url =
        URL.createObjectURL(blob);


    const a =
        document.createElement("a");


    a.href =
        url;


    a.download =
    "calculation_experiment_result_" +
    participantId +
    ".csv";


    a.click();


    URL.revokeObjectURL(url);

}


// =======================
// 参加者番号入力
// =======================

participantNextButton.addEventListener(
    "click",
    ()=>{

        // 参加者番号を取得
        participantId =
            participantIdInput.value.trim();

        // 未入力なら次に進まない
        if(participantId === ""){
            alert("参加者番号を入力してください。");
            return;
        }

        // 参加者番号画面を消す
        participantScreen.style.display =
            "none";

        // 課題説明画面を表示
        startScreen.style.display =
            "block";

    }
);


// =======================
// 実験開始
// =======================

startButton.addEventListener(
    "click",
    ()=>{

        // 課題説明画面を消す
        startScreen.style.display =
            "none";

        // 問題画面を表示
        questionScreen.style.display =
            "block";

        // 条件を作る
        generateConditions();

        // 計算問題を64問作る
        generateQuestions();

        // 最初の問題を表示
        showQuestion();

    }
);


// =======================
// YES
// =======================

yesButton.addEventListener(
    "click",
    ()=>{

        checkAnswer(true);

    }
);


// =======================
// NO
// =======================

noButton.addEventListener(
    "click",
    ()=>{

        checkAnswer(false);

    }
);


// =======================
// CSV保存ボタン
// =======================

downloadButton.addEventListener(
    "click",
    ()=>{

        downloadCSV();

    }
);
