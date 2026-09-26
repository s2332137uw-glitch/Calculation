/// =======================
// 画面
// =======================

const startButton =
    document.getElementById("startButton");

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

function generateQuestions(){

    // =======================
    // 問題プールを空にする
    // =======================

    questionPool = [];

    answerPool = [];


    // =======================
    // 20～99の数字を使用
    // =======================

    for(let a = 20; a <= 99; a++){

        for(let b = 20; b <= 99; b++){


            // =======================
            // 足し算
            // =======================

            // 1の位の合計が10以上
            // → 繰り上がりあり

            if(
                (a % 10) +
                (b % 10) >= 10
            ){

                const ans =
                    a + b;


                // -----------------------
                // 正しい問題
                // -----------------------

                questionPool.push(

                    a +
                    " + " +
                    b +
                    " = " +
                    ans

                );

                answerPool.push(true);


                // -----------------------
// 間違った問題
// 一の位は正解と同じ
// 十の位だけ変更
// -----------------------

let wrongAnswer;

if(
    Math.random() < 0.5
){

    // 十の位を10増やす
    wrongAnswer =
        ans + 10;

}else{

    // 十の位を10減らす
    wrongAnswer =
        ans - 10;

}


questionPool.push(

    a +
        " + " +
    b +
        " = " +
    wrongAnswer

);

answerPool.push(false);

            }


            // =======================
            // 引き算
            // =======================

            // a > b
            // かつ
            // aの1の位 < bの1の位
            //
            // → 繰り下がりあり

            if(
                a > b &&
                (a % 10) <
                (b % 10)
            ){

                const ans =
                    a - b;


                // -----------------------
                // 正しい問題
                // -----------------------

                questionPool.push(

                    a +
                    " - " +
                    b +
                    " = " +
                    ans

                );

                answerPool.push(true);


                // -----------------------
// 間違った問題
// 一の位は正解と同じ
// 十の位だけ変更
// -----------------------

let wrongAnswer;

if(ans >= 10){

    if(
        Math.random() < 0.5
    ){

        // 十の位を10増やす
        wrongAnswer =
            ans + 10;

    }else{

        // 十の位を10減らす
        wrongAnswer =
            ans - 10;

    }

}else{

    // 答えが10未満の場合
    // 10増やす
    wrongAnswer =
        ans + 10;

}


questionPool.push(

    a +
        " - " +
    b +
        " = " +
    wrongAnswer

);

answerPool.push(false);

            }

        }

    }


    // =======================
    // 問題をシャッフル
    // =======================

    let order = [];


    for(
        let i = 0;
        i < questionPool.length;
        i++
    ){

        order.push(i);

    }


    for(
        let i = order.length - 1;
        i > 0;
        i--
    ){

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );


        [
            order[i],
            order[j]
        ] =
        [
            order[j],
            order[i]
        ];

    }


    // =======================
    // 64問を決定
    // =======================

    questions = [];

    answers = [];


    for(
        let i = 0;
        i < totalQuestions;
        i++
    ){

        const index =
            order[i];


        questions.push(
            questionPool[index]
        );


        answers.push(
            answerPool[index]
        );

    }


    console.log(
        "問題プール：" +
        questionPool.length +
        "問"
    );


    console.log(
        "実験で使用する問題：" +
        questions.length +
        "問"
    );

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

            questionIndex = 0;


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
            "block";

        questionScreen.style.display =
            "none";


        waitLabel.textContent =
            "実験終了";


        // CSV保存ボタンを表示
        downloadButton.style.display =
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
            "block";

        questionScreen.style.display =
            "none";

        waitLabel.textContent =
            "実験終了";

        downloadButton.style.display =
            "block";

        return;
    }

    // ベース終了、または条件1～14終了
    conditionIndex++;
    startWaitScreen();

    return;
}


    // =======================
    // 次の問題
    // =======================

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
        "phase,task,stimulus,correct,reactionTime,mode,waitTime,condition\n";


    // =======================
    // 結果をCSVに追加
    // =======================

    results.forEach((r)=>{

        csv +=

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
        "calculation_experiment_result.csv";


    a.click();


    URL.revokeObjectURL(url);

}


// =======================
// 開始
// =======================

startButton.addEventListener(
    "click",
    ()=>{

        // =======================
        // 開始画面を消す
        // =======================

        startScreen.style.display =
            "none";


        // =======================
        // 問題画面を表示
        // =======================

        questionScreen.style.display =
            "block";


        // =======================
        // 条件を作る
        // =======================

        generateConditions();


        // =======================
        // 計算問題を64問作る
        // =======================

        generateQuestions();


        // =======================
        // 最初の問題を表示
        // =======================

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